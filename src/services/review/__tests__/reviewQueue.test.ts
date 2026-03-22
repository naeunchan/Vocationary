import type { FavoriteWordEntry } from "@/services/favorites/types";
import { applyReviewOutcome, createReviewProgressKey, deriveReviewQueue } from "@/services/review";
import type { ReviewProgressMap } from "@/services/review/types";

function buildEntry(args: {
    word: string;
    status?: FavoriteWordEntry["status"];
    updatedAt?: string;
}): FavoriteWordEntry {
    return {
        word: {
            word: args.word,
            phonetic: null,
            audioUrl: null,
            meanings: [{ partOfSpeech: "noun", definitions: [{ definition: `${args.word} definition` }] }],
        },
        status: args.status ?? "toMemorize",
        updatedAt: args.updatedAt ?? "2026-03-22T00:00:00.000Z",
    };
}

describe("deriveReviewQueue", () => {
    it("deduplicates normalized words and excludes mastered or future-due entries", () => {
        const favorites = [
            buildEntry({ word: "Apple", status: "review", updatedAt: "2026-03-22T10:00:00.000Z" }),
            buildEntry({ word: "apple", status: "review", updatedAt: "2026-03-22T12:00:00.000Z" }),
            buildEntry({ word: "banana", status: "mastered" }),
            buildEntry({ word: "carrot", status: "review" }),
            buildEntry({ word: "date", status: "toMemorize" }),
        ];
        const progress: ReviewProgressMap = {
            [createReviewProgressKey("apple")]: {
                word: "apple",
                lastReviewedAt: "2026-03-20T00:00:00.000Z",
                nextReviewAt: "2026-03-21T00:00:00.000Z",
                reviewCount: 2,
                correctStreak: 2,
                incorrectCount: 0,
                lastOutcome: "good",
            },
            [createReviewProgressKey("carrot")]: {
                word: "carrot",
                lastReviewedAt: "2026-03-22T00:00:00.000Z",
                nextReviewAt: "2026-03-30T00:00:00.000Z",
                reviewCount: 1,
                correctStreak: 1,
                incorrectCount: 0,
                lastOutcome: "good",
            },
        };

        const queue = deriveReviewQueue(favorites, progress, { now: new Date("2026-03-22T15:00:00.000Z") });

        expect(queue).toHaveLength(2);
        expect(queue.map((item) => item.entry.word.word)).toEqual(["apple", "date"]);
    });

    it("prioritizes review entries before toMemorize entries", () => {
        const favorites = [
            buildEntry({ word: "date", status: "toMemorize", updatedAt: "2026-03-22T09:00:00.000Z" }),
            buildEntry({ word: "apple", status: "review", updatedAt: "2026-03-22T08:00:00.000Z" }),
            buildEntry({ word: "banana", status: "review", updatedAt: "2026-03-22T07:00:00.000Z" }),
        ];
        const progress: ReviewProgressMap = {
            [createReviewProgressKey("apple")]: {
                word: "apple",
                lastReviewedAt: "2026-03-21T00:00:00.000Z",
                nextReviewAt: "2026-03-22T06:00:00.000Z",
                reviewCount: 1,
                correctStreak: 1,
                incorrectCount: 0,
                lastOutcome: "good",
            },
            [createReviewProgressKey("banana")]: {
                word: "banana",
                lastReviewedAt: "2026-03-20T00:00:00.000Z",
                nextReviewAt: "2026-03-22T05:00:00.000Z",
                reviewCount: 1,
                correctStreak: 1,
                incorrectCount: 0,
                lastOutcome: "good",
            },
        };

        const queue = deriveReviewQueue(favorites, progress, { now: new Date("2026-03-22T10:00:00.000Z") });

        expect(queue.map((item) => item.entry.word.word)).toEqual(["banana", "apple", "date"]);
    });
});

describe("applyReviewOutcome", () => {
    const reviewedAt = new Date("2026-03-22T10:00:00.000Z");

    it("resets progress and returns to toMemorize for again", () => {
        const result = applyReviewOutcome(
            buildEntry({ word: "apple", status: "review" }),
            {
                word: "apple",
                lastReviewedAt: "2026-03-21T00:00:00.000Z",
                nextReviewAt: "2026-03-22T00:00:00.000Z",
                reviewCount: 2,
                correctStreak: 2,
                incorrectCount: 0,
                lastOutcome: "good",
            },
            "again",
            { reviewedAt },
        );

        expect(result.status).toBe("toMemorize");
        expect(result.progress.correctStreak).toBe(0);
        expect(result.progress.incorrectCount).toBe(1);
        expect(result.progress.nextReviewAt).toBe("2026-03-23T10:00:00.000Z");
    });

    it("moves toMemorize entries into review for good", () => {
        const result = applyReviewOutcome(buildEntry({ word: "apple", status: "toMemorize" }), null, "good", {
            reviewedAt,
        });

        expect(result.status).toBe("review");
        expect(result.progress.reviewCount).toBe(1);
        expect(result.progress.correctStreak).toBe(1);
        expect(result.progress.nextReviewAt).toBe("2026-03-24T10:00:00.000Z");
    });

    it("promotes long-running review entries to mastered for easy", () => {
        const result = applyReviewOutcome(
            buildEntry({ word: "apple", status: "review" }),
            {
                word: "apple",
                lastReviewedAt: "2026-03-21T00:00:00.000Z",
                nextReviewAt: "2026-03-22T00:00:00.000Z",
                reviewCount: 3,
                correctStreak: 2,
                incorrectCount: 0,
                lastOutcome: "good",
            },
            "easy",
            { reviewedAt },
        );

        expect(result.status).toBe("mastered");
        expect(result.progress.reviewCount).toBe(4);
        expect(result.progress.correctStreak).toBe(3);
        expect(result.progress.nextReviewAt).toBe("2026-03-26T10:00:00.000Z");
    });
});
