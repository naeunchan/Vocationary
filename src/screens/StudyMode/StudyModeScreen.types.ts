import type { AppError } from "@/errors/AppError";
import type { WordResult } from "@/services/dictionary/types";
import type { StudyCard } from "@/services/study/types";

export type StudyModeSource = "search" | "favorites";

export type StudyModeLoadingViewModel = {
    source: StudyModeSource;
    status: "loading";
    word: WordResult;
};

export type StudyModeErrorViewModel = {
    source: StudyModeSource;
    status: "error";
    word: WordResult;
    error: AppError;
    retryable: boolean;
};

export type StudyModeActiveViewModel = {
    source: StudyModeSource;
    status: "active";
    word: WordResult;
    currentCard: StudyCard;
    currentIndex: number;
    totalCount: number;
    completedCount: number;
    correctCount: number;
    selectedAnswer: string | null;
    answerSubmitted: boolean;
    isCurrentAnswerCorrect: boolean | null;
};

export type StudyModeCompleteViewModel = {
    source: StudyModeSource;
    status: "complete";
    word: WordResult;
    totalCount: number;
    correctCount: number;
};

export type StudyModeViewModel =
    | StudyModeLoadingViewModel
    | StudyModeErrorViewModel
    | StudyModeActiveViewModel
    | StudyModeCompleteViewModel;

export type StudyModeScreenProps = {
    viewModel: StudyModeViewModel;
    onClose: () => void;
    onRetry: () => void;
    onRegenerate: () => void;
    onSelectChoice: (value: string) => void;
    onAdvance: () => void;
};
