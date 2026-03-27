import type { ReviewProgressEntry, ReviewProgressMap } from "@/services/review/types";

function normalizeReviewWordKey(word: string): string {
    return word.trim().toLowerCase();
}

function normalizeReviewMetric(value: unknown): number {
    if (typeof value !== "number" || !Number.isFinite(value)) {
        return 0;
    }

    return Math.max(0, Math.round(value));
}

function normalizeReviewOutcome(value: unknown): ReviewProgressEntry["lastOutcome"] {
    return value === "again" || value === "good" || value === "easy" ? value : null;
}

function cloneReviewProgressEntry(entry: ReviewProgressEntry): ReviewProgressEntry {
    return {
        word: normalizeReviewWordKey(entry.word),
        lastReviewedAt: entry.lastReviewedAt,
        nextReviewAt: entry.nextReviewAt,
        reviewCount: normalizeReviewMetric(entry.reviewCount),
        correctStreak: normalizeReviewMetric(entry.correctStreak),
        incorrectCount: normalizeReviewMetric(entry.incorrectCount),
        lastOutcome: normalizeReviewOutcome(entry.lastOutcome),
    };
}

export function cloneGuestReviewProgress(progress: ReviewProgressMap): ReviewProgressMap {
    return Object.fromEntries(
        Object.entries(progress)
            .map(([rawKey, entry]) => {
                const key = normalizeReviewWordKey(rawKey || entry.word);
                if (!key) {
                    return null;
                }

                return [
                    key,
                    cloneReviewProgressEntry({
                        ...entry,
                        word: key,
                    }),
                ] satisfies [string, ReviewProgressEntry];
            })
            .filter((entry): entry is [string, ReviewProgressEntry] => Boolean(entry)),
    );
}

export function parseGuestReviewProgress(raw: string | null): ReviewProgressMap {
    if (!raw) {
        return {};
    }

    try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
            return {};
        }

        return cloneGuestReviewProgress(parsed as ReviewProgressMap);
    } catch {
        return {};
    }
}

function parseIsoTime(value: string | null): number {
    if (!value) {
        return Number.NEGATIVE_INFINITY;
    }

    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
}

function pickLatestReviewProgress(current: ReviewProgressEntry, incoming: ReviewProgressEntry): ReviewProgressEntry {
    const currentTime = parseIsoTime(current.lastReviewedAt);
    const incomingTime = parseIsoTime(incoming.lastReviewedAt);
    return incomingTime >= currentTime ? incoming : current;
}

export function mergeGuestReviewProgress(base: ReviewProgressMap, incoming: ReviewProgressMap): ReviewProgressMap {
    const merged = cloneGuestReviewProgress(base);

    Object.entries(cloneGuestReviewProgress(incoming)).forEach(([word, entry]) => {
        const existing = merged[word];
        merged[word] = existing ? pickLatestReviewProgress(existing, entry) : entry;
    });

    return merged;
}
