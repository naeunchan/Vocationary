import type { MeaningEntry } from "@/services/dictionary/types";
import type { StudyCard, StudyCardDeck, StudyCardPayload, StudyCardType } from "@/services/study/types";

export const DEFAULT_STUDY_CARD_LIMIT = 4;
export const MAX_STUDY_CARD_LIMIT = 6;
const MIN_STUDY_CARD_LIMIT = 1;
const MIN_CHOICE_COUNT = 3;
const MAX_CHOICE_COUNT = 4;

function normalizeText(value: unknown): string {
    return typeof value === "string" ? value.trim() : "";
}

function normalizeWord(value: string): string {
    return value.trim();
}

function normalizeWordKey(value: string): string {
    return normalizeWord(value).toLowerCase();
}

function normalizeStudyCardType(value: unknown): StudyCardType | null {
    return value === "definition_match" || value === "cloze" ? value : null;
}

function createStudyCardId(word: string, type: StudyCardType, index: number): string {
    return `${normalizeWordKey(word)}:${type}:${index}`;
}

function normalizeChoices(
    rawChoices: unknown,
    rawAnswerIndex: unknown,
): { choices: string[]; answerIndex: number } | null {
    if (!Array.isArray(rawChoices)) {
        return null;
    }

    const sourceAnswerIndex = Number(rawAnswerIndex);
    if (!Number.isInteger(sourceAnswerIndex) || sourceAnswerIndex < 0) {
        return null;
    }

    const choices: string[] = [];
    const seen = new Map<string, number>();
    let answerIndex = -1;

    rawChoices.forEach((choice, index) => {
        const normalizedChoice = normalizeText(choice);
        if (!normalizedChoice) {
            return;
        }

        const key = normalizedChoice.toLowerCase();
        const existingIndex = seen.get(key);
        if (existingIndex != null) {
            if (index === sourceAnswerIndex) {
                answerIndex = existingIndex;
            }
            return;
        }

        if (choices.length >= MAX_CHOICE_COUNT) {
            return;
        }

        const nextIndex = choices.length;
        seen.set(key, nextIndex);
        choices.push(normalizedChoice);
        if (index === sourceAnswerIndex) {
            answerIndex = nextIndex;
        }
    });

    if (choices.length < MIN_CHOICE_COUNT || answerIndex < 0 || answerIndex >= choices.length) {
        return null;
    }

    return {
        choices,
        answerIndex,
    };
}

function normalizeStudyCard(word: string, rawCard: unknown, index: number): StudyCard | null {
    if (!rawCard || typeof rawCard !== "object") {
        return null;
    }

    const candidate = rawCard as {
        type?: unknown;
        prompt?: unknown;
        choices?: unknown;
        answerIndex?: unknown;
        explanation?: unknown;
    };
    const type = normalizeStudyCardType(candidate.type);
    const prompt = normalizeText(candidate.prompt);
    const explanation = normalizeText(candidate.explanation);
    const normalizedChoices = normalizeChoices(candidate.choices, candidate.answerIndex);

    if (!type || !prompt || !explanation || !normalizedChoices) {
        return null;
    }

    return {
        id: createStudyCardId(word, type, index),
        type,
        prompt,
        choices: normalizedChoices.choices,
        answerIndex: normalizedChoices.answerIndex,
        explanation,
    };
}

export function clampStudyCardLimit(value: number | undefined): number {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
        return DEFAULT_STUDY_CARD_LIMIT;
    }

    return Math.min(MAX_STUDY_CARD_LIMIT, Math.max(MIN_STUDY_CARD_LIMIT, Math.round(numericValue)));
}

export function createStudyCardCacheKey(
    word: string,
    meanings: MeaningEntry[],
    options: { cardLimit?: number } = {},
): string {
    const signature = meanings
        .map((meaning, meaningIndex) => {
            const partOfSpeech = normalizeText(meaning.partOfSpeech);
            const definitions = meaning.definitions
                .map((definition, definitionIndex) => {
                    const baseDefinition = normalizeText(definition.originalDefinition ?? definition.definition);
                    return baseDefinition ? `${meaningIndex}:${definitionIndex}:${baseDefinition}` : "";
                })
                .filter(Boolean)
                .join("|");

            return `${partOfSpeech}:${definitions}`;
        })
        .filter(Boolean)
        .join("||");

    return `${normalizeWordKey(word)}:${clampStudyCardLimit(options.cardLimit)}:${signature}`;
}

export function normalizeStudyCardDeck(
    word: string,
    payload: StudyCardPayload | unknown,
    options: { cardLimit?: number } = {},
): StudyCardDeck {
    const normalizedWord = normalizeWord(word);
    const limit = clampStudyCardLimit(options.cardLimit);
    const candidate = payload && typeof payload === "object" ? (payload as StudyCardPayload) : {};
    const rawCards = Array.isArray(candidate.cards) ? candidate.cards : [];
    const cards = rawCards
        .map((card, index) => normalizeStudyCard(normalizedWord, card, index))
        .filter((card): card is StudyCard => Boolean(card))
        .slice(0, limit);

    return {
        word: normalizedWord,
        cards,
        generatedAt: normalizeText(candidate.generatedAt) || new Date().toISOString(),
    };
}
