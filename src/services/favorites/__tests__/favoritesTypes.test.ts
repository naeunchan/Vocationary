import { WordResult } from "@/services/dictionary/types";
import {
    createFavoriteEntry,
    FavoriteWordEntry,
    isMemorizationStatus,
    MEMORIZATION_STATUS_ORDER,
} from "@/services/favorites/types";

const baseWord: WordResult = {
    word: "banana",
    phonetic: "/bəˈnæn.ə/",
    audioUrl: null,
    meanings: [
        {
            partOfSpeech: "noun",
            definitions: [{ definition: "바나나" }],
        },
    ],
};

describe("favorites types helpers", () => {
    it("creates favorite entry with default status", () => {
        const entry = createFavoriteEntry(baseWord);
        expect(entry.status).toBe("toMemorize");
        expect(entry.word).toBe(baseWord);
        expect(typeof entry.updatedAt).toBe("string");
    });

    it("validates memorization status", () => {
        expect(isMemorizationStatus("review")).toBe(true);
        expect(isMemorizationStatus("unknown")).toBe(false);
    });

    it("exposes ordered statuses", () => {
        expect(MEMORIZATION_STATUS_ORDER).toEqual(["toMemorize", "review", "mastered"]);
    });
});
