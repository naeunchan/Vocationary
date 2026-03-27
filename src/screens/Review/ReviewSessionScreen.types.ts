import type { ReviewOutcome, ReviewQueueItem } from "@/services/review/types";

export type ActiveReviewSessionViewModel = {
    status: "active";
    currentItem: ReviewQueueItem;
    currentIndex: number;
    totalCount: number;
    completedCount: number;
    correctCount: number;
    incorrectCount: number;
    pending: boolean;
};

export type CompleteReviewSessionViewModel = {
    status: "complete";
    totalCount: number;
    completedCount: number;
    correctCount: number;
    incorrectCount: number;
};

export type ReviewSessionViewModel = ActiveReviewSessionViewModel | CompleteReviewSessionViewModel;

export type ReviewSessionScreenProps = {
    session: ReviewSessionViewModel;
    onApplyOutcome: (outcome: ReviewOutcome) => void;
    onClose: () => void;
};
