import type { MeaningEntry } from "@/services/dictionary/types";
import {
    clampStudyCardLimit,
    createStudyCardCacheKey,
    normalizeStudyCardDeck,
    setCachedStudyCardDeck,
    getCachedStudyCardDeck,
    clearStudyCardDeckCache,
} from "@/services/study";

const meanings: MeaningEntry[] = [
    {
        partOfSpeech: "noun",
        definitions: [
            {
                definition: "a fruit that is usually red or green",
            },
        ],
    },
];

describe("studyCards domain", () => {
    afterEach(() => {
        clearStudyCardDeckCache();
    });

    it("normalizes payloads and drops malformed cards", () => {
        const deck = normalizeStudyCardDeck(
            " apple ",
            {
                generatedAt: "2026-03-22T00:00:00.000Z",
                cards: [
                    {
                        type: "cloze",
                        prompt: "I ate an ____ after lunch.",
                        choices: ["apple", "stone", "chair", "clock"],
                        answerIndex: 0,
                        explanation: "apple means a kind of fruit.",
                    },
                    {
                        type: "unknown",
                        prompt: "invalid",
                        choices: ["a", "b", "c"],
                        answerIndex: 0,
                        explanation: "invalid",
                    },
                ],
            },
            { cardLimit: 4 },
        );

        expect(deck).toEqual({
            word: "apple",
            generatedAt: "2026-03-22T00:00:00.000Z",
            cards: [
                {
                    id: "apple:cloze:0",
                    type: "cloze",
                    prompt: "I ate an ____ after lunch.",
                    choices: ["apple", "stone", "chair", "clock"],
                    answerIndex: 0,
                    explanation: "apple means a kind of fruit.",
                },
            ],
        });
    });

    it("creates deterministic cache keys from word, meanings, and limit", () => {
        const first = createStudyCardCacheKey("Apple", meanings, { cardLimit: 4 });
        const second = createStudyCardCacheKey(" apple ", meanings, { cardLimit: 4 });
        const third = createStudyCardCacheKey("apple", meanings, { cardLimit: 2 });

        expect(first).toBe(second);
        expect(first).not.toBe(third);
    });

    it("stores and expires cached decks safely", () => {
        const cacheKey = createStudyCardCacheKey("apple", meanings);
        setCachedStudyCardDeck(
            cacheKey,
            {
                word: "apple",
                generatedAt: "2026-03-22T00:00:00.000Z",
                cards: [
                    {
                        id: "apple:definition_match:0",
                        type: "definition_match",
                        prompt: "Which meaning matches apple?",
                        choices: ["fruit", "animal", "vehicle"],
                        answerIndex: 0,
                        explanation: "Apple is a fruit.",
                    },
                ],
            },
            { now: 100, ttlMs: 50 },
        );

        expect(getCachedStudyCardDeck(cacheKey, 120)).toMatchObject({
            word: "apple",
            cards: [expect.objectContaining({ type: "definition_match" })],
        });
        expect(getCachedStudyCardDeck(cacheKey, 151)).toBeNull();
    });

    it("clamps card limits to the safe range", () => {
        expect(clampStudyCardLimit(undefined)).toBe(4);
        expect(clampStudyCardLimit(0)).toBe(1);
        expect(clampStudyCardLimit(99)).toBe(6);
    });
});
