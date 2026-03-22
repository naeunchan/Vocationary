import type { MeaningEntry } from "@/services/dictionary/types";

export type StudyCardType = "definition_match" | "cloze";

export type StudyCard = {
    id: string;
    type: StudyCardType;
    prompt: string;
    choices: string[];
    answerIndex: number;
    explanation: string;
};

export type StudyCardDeck = {
    word: string;
    cards: StudyCard[];
    generatedAt: string;
};

export type StudyCardPayload = {
    cards?: unknown;
    generatedAt?: unknown;
};

export type StudyCardGeneratorOptions = {
    cardLimit?: number;
    forceFresh?: boolean;
};

export type StudyCardRequestPayload = {
    word: string;
    meanings: MeaningEntry[];
    cardLimit?: number;
};
