import {
    cloneReviewProgressEntry,
    cloneReviewProgressMap,
    ensureStateLoaded,
    memoryState,
    persistState,
} from "@/services/database/state";
import type { ReviewProgressEntry, ReviewProgressMap } from "@/services/review/types";

function createReviewProgressKey(word: string): string {
    return word.trim().toLowerCase();
}

export async function getReviewProgressByUser(userId: number): Promise<ReviewProgressMap> {
    await ensureStateLoaded();
    return cloneReviewProgressMap(memoryState.reviewProgressByUser[userId] ?? {});
}

export async function setReviewProgressForUser(userId: number, progress: ReviewProgressMap) {
    await ensureStateLoaded();
    memoryState.reviewProgressByUser[userId] = cloneReviewProgressMap(progress);
    await persistState();
}

export async function upsertReviewProgressForUser(userId: number, entry: ReviewProgressEntry) {
    await ensureStateLoaded();

    const key = createReviewProgressKey(entry.word);
    if (!key) {
        return;
    }

    const current = memoryState.reviewProgressByUser[userId] ?? {};
    memoryState.reviewProgressByUser[userId] = {
        ...current,
        [key]: cloneReviewProgressEntry({
            ...entry,
            word: key,
        }),
    };
    await persistState();
}

export async function removeReviewProgressForUser(userId: number, word: string) {
    await ensureStateLoaded();

    const key = createReviewProgressKey(word);
    if (!key) {
        return;
    }

    const current = memoryState.reviewProgressByUser[userId] ?? {};
    if (!current[key]) {
        return;
    }

    const next = { ...current };
    delete next[key];
    memoryState.reviewProgressByUser[userId] = next;
    await persistState();
}
