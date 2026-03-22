import { applyCollectionBatchAction, createCollection } from "@/services/collections";
import type { FavoriteWordEntry } from "@/services/favorites/types";

function buildFavorite(word: string, status: FavoriteWordEntry["status"] = "toMemorize"): FavoriteWordEntry {
    return {
        word: {
            word,
            phonetic: null,
            audioUrl: null,
            meanings: [{ partOfSpeech: "noun", definitions: [{ definition: `${word} definition` }] }],
        },
        status,
        updatedAt: "2026-03-23T00:00:00.000Z",
    };
}

describe("collection batch actions", () => {
    it("updates favorite status in bulk", () => {
        const result = applyCollectionBatchAction(
            {
                favorites: [buildFavorite("apple"), buildFavorite("berry", "review")],
                collections: [],
            },
            { type: "setStatus", wordKeys: ["apple"], status: "mastered", updatedAt: "2026-03-24T00:00:00.000Z" },
        );

        expect(result.favorites).toEqual([
            expect.objectContaining({ word: expect.objectContaining({ word: "apple" }), status: "mastered" }),
            expect.objectContaining({ word: expect.objectContaining({ word: "berry" }), status: "review" }),
        ]);
    });

    it("removes favorites and clears their collection membership", () => {
        const collection = {
            ...createCollection("A", { id: "a", createdAt: "2026-03-23T00:00:00.000Z" }),
            wordKeys: ["apple", "berry"],
        };

        const result = applyCollectionBatchAction(
            {
                favorites: [buildFavorite("apple"), buildFavorite("berry")],
                collections: [collection],
            },
            { type: "removeFavorites", wordKeys: ["berry"] },
        );

        expect(result.favorites).toHaveLength(1);
        expect(result.collections[0].wordKeys).toEqual(["apple"]);
    });

    it("adds favorites to a collection and enforces single membership", () => {
        const first = {
            ...createCollection("A", { id: "a", createdAt: "2026-03-23T00:00:00.000Z" }),
            wordKeys: ["apple"],
        };
        const second = createCollection("B", { id: "b", createdAt: "2026-03-23T00:00:00.000Z" });

        const result = applyCollectionBatchAction(
            {
                favorites: [buildFavorite("apple"), buildFavorite("berry")],
                collections: [first, second],
            },
            { type: "addToCollection", wordKeys: ["apple", "berry"], collectionId: "b" },
        );

        expect(result.collections).toEqual([
            expect.objectContaining({ id: "a", wordKeys: [] }),
            expect.objectContaining({ id: "b", wordKeys: ["apple", "berry"] }),
        ]);
    });
});
