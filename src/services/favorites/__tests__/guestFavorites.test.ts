import { mergeFavoriteEntries, parseGuestFavoriteEntries } from "@/services/favorites/guestFavorites";
import type { FavoriteWordEntry } from "@/services/favorites/types";

function createEntry(word: string, updatedAt: string, definition = `${word} definition`): FavoriteWordEntry {
    return {
        word: {
            word,
            phonetic: `/${word}/`,
            meanings: [
                {
                    partOfSpeech: "noun",
                    definitions: [{ definition }],
                },
            ],
        },
        status: "toMemorize",
        updatedAt,
    };
}

describe("guestFavorites helpers", () => {
    it("parses only valid guest favorite entries", () => {
        const parsed = parseGuestFavoriteEntries(
            JSON.stringify([createEntry("apple", "2026-03-22T00:00:00.000Z"), { invalid: true }, null]),
        );

        expect(parsed).toEqual([expect.objectContaining({ word: expect.objectContaining({ word: "apple" }) })]);
    });

    it("merges favorites by latest timestamp and keeps newest entries first", () => {
        const merged = mergeFavoriteEntries(
            [
                createEntry("banana", "2026-03-22T00:00:00.000Z"),
                createEntry("apple", "2026-03-22T01:00:00.000Z", "older apple"),
            ],
            [
                createEntry("apple", "2026-03-22T02:00:00.000Z", "newer apple"),
                createEntry("pear", "2026-03-22T03:00:00.000Z"),
            ],
        );

        expect(merged).toEqual([
            expect.objectContaining({ word: expect.objectContaining({ word: "pear" }) }),
            expect.objectContaining({
                word: expect.objectContaining({
                    word: "apple",
                    meanings: [{ definitions: [{ definition: "newer apple" }], partOfSpeech: "noun" }],
                }),
            }),
            expect.objectContaining({ word: expect.objectContaining({ word: "banana" }) }),
        ]);
    });
});
