import { generateStudyCards } from "@/api/dictionary/studyCardGenerator";
import { createAppError } from "@/errors/AppError";
import { MeaningEntry } from "@/services/dictionary/types/WordResult";
import {
    buildStudyCacheKey,
    getCachedStudySession,
    peekCachedStudySession,
    setCachedStudySession,
} from "@/services/study/cache";
import { DEFAULT_STUDY_CARD_TYPES, StudyCard, StudyCardType, StudySession } from "@/services/study/types";

type LoadAIStudySessionOptions = {
    forceFresh?: boolean;
    cardTypes?: StudyCardType[];
    cardCount?: number;
};

const inFlightStudySessionLoads = new Map<string, Promise<StudySession>>();

function clampCardCount(value: number | undefined): number {
    if (!Number.isFinite(value)) {
        return 3;
    }

    return Math.min(6, Math.max(1, Math.round(value as number)));
}

function normalizeCardTypes(cardTypes: StudyCardType[] | undefined): StudyCardType[] {
    if (!cardTypes || cardTypes.length === 0) {
        return [...DEFAULT_STUDY_CARD_TYPES];
    }

    const normalized = Array.from(new Set(cardTypes.filter((cardType) => DEFAULT_STUDY_CARD_TYPES.includes(cardType))));
    return normalized.length > 0 ? normalized : [...DEFAULT_STUDY_CARD_TYPES];
}

function hasStudyContext(meanings: MeaningEntry[]): boolean {
    return meanings.some((meaning) =>
        meaning.definitions.some((definition) =>
            Boolean((definition.originalDefinition ?? definition.definition)?.trim()),
        ),
    );
}

function normalizeAnswer(value: string): string {
    return value.trim().toLowerCase();
}

async function loadFreshStudySession(
    cacheKey: string,
    normalizedWord: string,
    meanings: MeaningEntry[],
    cardTypes: StudyCardType[],
    cardCount: number,
): Promise<StudySession> {
    const pending = inFlightStudySessionLoads.get(cacheKey);
    if (pending) {
        return await pending;
    }

    const task = generateStudyCards(normalizedWord, meanings, { cardTypes, cardCount })
        .then((cards) => {
            const session = {
                word: normalizedWord,
                cards,
                generatedAt: Date.now(),
            };
            setCachedStudySession(cacheKey, session);
            return getCachedStudySession(cacheKey) ?? session;
        })
        .finally(() => {
            inFlightStudySessionLoads.delete(cacheKey);
        });

    inFlightStudySessionLoads.set(cacheKey, task);
    return await task;
}

export async function loadAIStudySession(
    word: string,
    meanings: MeaningEntry[],
    options: LoadAIStudySessionOptions = {},
): Promise<StudySession> {
    const normalizedWord = word.trim();
    if (!normalizedWord) {
        throw createAppError("ValidationError", "학습할 단어가 없어요.", {
            code: "AI_STUDY_EMPTY_WORD",
            retryable: false,
        });
    }

    if (!hasStudyContext(meanings)) {
        throw createAppError("ValidationError", "학습 카드에 사용할 뜻이 없어요.", {
            code: "AI_STUDY_EMPTY_CONTEXT",
            retryable: false,
        });
    }

    const cardTypes = normalizeCardTypes(options.cardTypes);
    const cardCount = clampCardCount(options.cardCount);
    const cacheKey = buildStudyCacheKey(normalizedWord, meanings, cardTypes, cardCount);

    if (!options.forceFresh) {
        const snapshot = peekCachedStudySession(cacheKey);
        if (snapshot) {
            if (snapshot.isFresh) {
                return snapshot.session;
            }

            void loadFreshStudySession(cacheKey, normalizedWord, meanings, cardTypes, cardCount).catch(() => {});
            return snapshot.session;
        }
    }

    return await loadFreshStudySession(cacheKey, normalizedWord, meanings, cardTypes, cardCount);
}

export function isStudyAnswerCorrect(card: Pick<StudyCard, "answer">, submittedAnswer: string): boolean {
    return normalizeAnswer(card.answer) === normalizeAnswer(submittedAnswer);
}

export function countCorrectStudyAnswers(cards: StudyCard[], answers: Record<string, string | undefined>): number {
    return cards.reduce((total, card) => {
        const answer = answers[card.id];
        return answer && isStudyAnswerCorrect(card, answer) ? total + 1 : total;
    }, 0);
}
