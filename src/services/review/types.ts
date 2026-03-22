import type { FavoriteWordEntry, MemorizationStatus } from "@/services/favorites/types";

export type ReviewOutcome = "again" | "good" | "easy";

export type ReviewProgressEntry = {
    word: string;
    lastReviewedAt: string | null;
    nextReviewAt: string | null;
    reviewCount: number;
    correctStreak: number;
    incorrectCount: number;
    lastOutcome: ReviewOutcome | null;
};

export type ReviewProgressMap = Record<string, ReviewProgressEntry>;

export type ReviewQueueItem = {
    entry: FavoriteWordEntry;
    progress: ReviewProgressEntry | null;
};

export type ApplyReviewOutcomeResult = {
    status: MemorizationStatus;
    progress: ReviewProgressEntry;
};
