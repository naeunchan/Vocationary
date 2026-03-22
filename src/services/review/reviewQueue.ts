import type { FavoriteWordEntry, MemorizationStatus } from "@/services/favorites/types";
import type {
    ApplyReviewOutcomeResult,
    ReviewOutcome,
    ReviewProgressEntry,
    ReviewProgressMap,
    ReviewQueueItem,
} from "@/services/review/types";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function normalizeWordKey(word: string): string {
    return word.trim().toLowerCase();
}

function parseIsoTime(value: string | null): number {
    if (!value) {
        return Number.POSITIVE_INFINITY;
    }

    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
}

function isDue(progress: ReviewProgressEntry | null, nowMs: number): boolean {
    if (!progress?.nextReviewAt) {
        return true;
    }

    return parseIsoTime(progress.nextReviewAt) <= nowMs;
}

function getStatusPriority(status: MemorizationStatus): number {
    if (status === "review") {
        return 0;
    }
    if (status === "toMemorize") {
        return 1;
    }
    return 2;
}

function getDuePriority(progress: ReviewProgressEntry | null): number {
    if (!progress?.nextReviewAt) {
        return Number.NEGATIVE_INFINITY;
    }
    return parseIsoTime(progress.nextReviewAt);
}

function cloneProgressEntry(word: string, progress?: ReviewProgressEntry | null): ReviewProgressEntry {
    return {
        word,
        lastReviewedAt: progress?.lastReviewedAt ?? null,
        nextReviewAt: progress?.nextReviewAt ?? null,
        reviewCount: progress?.reviewCount ?? 0,
        correctStreak: progress?.correctStreak ?? 0,
        incorrectCount: progress?.incorrectCount ?? 0,
        lastOutcome: progress?.lastOutcome ?? null,
    };
}

export function createReviewProgressKey(word: string): string {
    return normalizeWordKey(word);
}

export function deriveReviewQueue(
    favorites: FavoriteWordEntry[],
    reviewProgress: ReviewProgressMap = {},
    options?: { now?: Date; limit?: number },
): ReviewQueueItem[] {
    const nowMs = (options?.now ?? new Date()).getTime();
    const deduped = new Map<string, ReviewQueueItem>();

    for (const entry of favorites) {
        if (entry.status === "mastered") {
            continue;
        }

        const key = createReviewProgressKey(entry.word.word);
        if (!key) {
            continue;
        }

        const progress = reviewProgress[key] ?? null;
        if (!isDue(progress, nowMs)) {
            continue;
        }

        const current = deduped.get(key);
        if (!current) {
            deduped.set(key, { entry, progress });
            continue;
        }

        if (Date.parse(entry.updatedAt) > Date.parse(current.entry.updatedAt)) {
            deduped.set(key, { entry, progress });
        }
    }

    const sorted = Array.from(deduped.values()).sort((left, right) => {
        const statusDiff = getStatusPriority(left.entry.status) - getStatusPriority(right.entry.status);
        if (statusDiff !== 0) {
            return statusDiff;
        }

        const dueDiff = getDuePriority(left.progress) - getDuePriority(right.progress);
        if (dueDiff !== 0) {
            return dueDiff;
        }

        const updatedAtDiff = Date.parse(right.entry.updatedAt) - Date.parse(left.entry.updatedAt);
        if (updatedAtDiff !== 0) {
            return updatedAtDiff;
        }

        return left.entry.word.word.localeCompare(right.entry.word.word);
    });

    const limit = options?.limit;
    return typeof limit === "number" && limit > 0 ? sorted.slice(0, limit) : sorted;
}

export function applyReviewOutcome(
    entry: FavoriteWordEntry,
    progress: ReviewProgressEntry | null,
    outcome: ReviewOutcome,
    options?: { reviewedAt?: Date },
): ApplyReviewOutcomeResult {
    const reviewedAt = options?.reviewedAt ?? new Date();
    const nextDay = new Date(reviewedAt.getTime() + DAY_IN_MS).toISOString();
    const plusTwoDays = new Date(reviewedAt.getTime() + DAY_IN_MS * 2).toISOString();
    const plusFourDays = new Date(reviewedAt.getTime() + DAY_IN_MS * 4).toISOString();
    const nextProgress = cloneProgressEntry(createReviewProgressKey(entry.word.word), progress);

    nextProgress.lastReviewedAt = reviewedAt.toISOString();
    nextProgress.lastOutcome = outcome;

    if (outcome === "again") {
        nextProgress.correctStreak = 0;
        nextProgress.incorrectCount += 1;
        nextProgress.nextReviewAt = nextDay;

        return {
            status: "toMemorize",
            progress: nextProgress,
        };
    }

    nextProgress.reviewCount += 1;
    nextProgress.correctStreak += 1;

    if (outcome === "good") {
        nextProgress.nextReviewAt = plusTwoDays;
        return {
            status: entry.status === "toMemorize" ? "review" : entry.status,
            progress: nextProgress,
        };
    }

    nextProgress.nextReviewAt = plusFourDays;

    const nextStatus =
        entry.status === "review" && (progress?.correctStreak ?? 0) >= 2
            ? "mastered"
            : entry.status === "toMemorize"
              ? "review"
              : entry.status;

    return {
        status: nextStatus,
        progress: nextProgress,
    };
}
