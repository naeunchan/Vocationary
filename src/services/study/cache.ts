import { MeaningEntry } from "@/services/dictionary/types/WordResult";
import { DEFAULT_STUDY_CARD_TYPES, StudyCard, StudyCardType, StudySession } from "@/services/study/types";

const STUDY_CACHE_TTL_MS = 1000 * 60 * 20;

type CacheEntry = {
    expiresAt: number;
    value: StudySession;
};

export type CachedStudySessionSnapshot = {
    isFresh: boolean;
    session: StudySession;
};

const studySessionCache = new Map<string, CacheEntry>();

function cloneStudyCards(cards: StudyCard[]): StudyCard[] {
    return cards.map((card) => ({
        ...card,
        choices: card.choices.map((choice) => ({ ...choice })),
    }));
}

function cloneStudySession(session: StudySession): StudySession {
    return {
        ...session,
        cards: cloneStudyCards(session.cards),
    };
}

function buildMeaningSignature(meanings: MeaningEntry[]): string {
    return meanings
        .map((meaning, meaningIndex) =>
            meaning.definitions
                .map((definition, definitionIndex) => {
                    const baseDefinition = definition.originalDefinition ?? definition.definition;
                    const partOfSpeech = meaning.partOfSpeech?.trim().toLowerCase() ?? "";
                    const example = definition.example?.trim().toLowerCase() ?? "";
                    return `${meaningIndex}:${definitionIndex}:${partOfSpeech}:${baseDefinition.trim().toLowerCase()}:${example}`;
                })
                .join("|"),
        )
        .join("||");
}

export function buildStudyCacheKey(
    word: string,
    meanings: MeaningEntry[],
    cardTypes: readonly StudyCardType[] = DEFAULT_STUDY_CARD_TYPES,
    cardCount = 3,
): string {
    const normalizedWord = word.trim().toLowerCase();
    const normalizedCardTypes = [...cardTypes].sort().join(",");
    return `${normalizedWord}:${cardCount}:${normalizedCardTypes}:${buildMeaningSignature(meanings)}`;
}

export function getCachedStudySession(cacheKey: string, now = Date.now()): StudySession | null {
    const cached = studySessionCache.get(cacheKey);
    if (!cached || cached.expiresAt <= now) {
        if (cached && cached.expiresAt <= now) {
            studySessionCache.delete(cacheKey);
        }
        return null;
    }

    return cloneStudySession(cached.value);
}

export function peekCachedStudySession(cacheKey: string, now = Date.now()): CachedStudySessionSnapshot | null {
    const cached = studySessionCache.get(cacheKey);
    if (!cached) {
        return null;
    }

    return {
        isFresh: cached.expiresAt > now,
        session: cloneStudySession(cached.value),
    };
}

export function setCachedStudySession(cacheKey: string, session: StudySession, now = Date.now()): void {
    studySessionCache.set(cacheKey, {
        expiresAt: now + STUDY_CACHE_TTL_MS,
        value: cloneStudySession(session),
    });
}

export function clearStudySessionCache(): void {
    studySessionCache.clear();
}
