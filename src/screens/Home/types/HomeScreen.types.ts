import type { ReviewSessionViewModel } from "@/screens/Review/ReviewSessionScreen.types";
import { FavoriteWordEntry, MemorizationStatus } from "@/services/favorites/types";
import type { ReviewOutcome } from "@/services/review/types";

export type HomeScreenProps = {
    favorites: FavoriteWordEntry[];
    onMoveToStatus: (word: string, status: MemorizationStatus) => void;
    userName: string;
    onPlayWordAudio: (word: FavoriteWordEntry["word"]) => void;
    pronunciationAvailable: boolean;
    reviewEnabled: boolean;
    reviewSummary: {
        dueCount: number;
        canStartReview: boolean;
    };
    reviewSession: ReviewSessionViewModel | null;
    onStartReviewSession: () => void;
    onCloseReviewSession: () => void;
    onApplyReviewOutcome: (outcome: ReviewOutcome) => void;
};
