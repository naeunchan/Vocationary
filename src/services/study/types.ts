export const DEFAULT_STUDY_CARD_TYPES = ["cloze", "definition-choice", "usage-check"] as const;

export type StudyCardType = (typeof DEFAULT_STUDY_CARD_TYPES)[number];

export type StudyCardChoice = {
    id: string;
    label: string;
    value: string;
};

export type StudyCard = {
    id: string;
    type: StudyCardType;
    prompt: string;
    choices: StudyCardChoice[];
    answer: string;
    explanation?: string | null;
};

export type StudySession = {
    word: string;
    cards: StudyCard[];
    generatedAt: number;
};
