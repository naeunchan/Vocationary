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
