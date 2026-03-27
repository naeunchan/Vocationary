import { generateDefinitionExamples } from "@/api/dictionary/exampleGenerator";
import { fetchDictionaryEntry } from "@/api/dictionary/freeDictionaryClient";
import { getWordData } from "@/api/dictionary/getWordData";

jest.mock("@/api/dictionary/exampleGenerator", () => ({
    generateDefinitionExamples: jest.fn(),
}));

jest.mock("@/api/dictionary/freeDictionaryClient", () => ({
    fetchDictionaryEntry: jest.fn(),
}));

const mockGenerateDefinitionExamples = generateDefinitionExamples as jest.MockedFunction<
    typeof generateDefinitionExamples
>;
const mockFetchDictionaryEntry = fetchDictionaryEntry as jest.MockedFunction<typeof fetchDictionaryEntry>;

const baseResult = {
    word: "apple",
    phonetic: "/ˈæp.əl/",
    meanings: [
        {
            partOfSpeech: "noun",
            definitions: [{ definition: "Fruit" }],
        },
    ],
};

describe("getWordData", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockFetchDictionaryEntry.mockResolvedValue(baseResult);
        mockGenerateDefinitionExamples.mockResolvedValue([]);
    });

    it("does not preload examples by default", async () => {
        const result = await getWordData("apple");

        expect(result.base).toEqual(baseResult);
        await expect(result.examplesPromise).resolves.toEqual([]);
        expect(mockGenerateDefinitionExamples).not.toHaveBeenCalled();
    });

    it("preloads examples only when requested", async () => {
        mockGenerateDefinitionExamples.mockResolvedValue([
            {
                meaningIndex: 0,
                definitionIndex: 0,
                example: "An apple a day helps.",
            },
        ]);

        const result = await getWordData("apple", { prefetchExamples: true });

        await expect(result.examplesPromise).resolves.toEqual([
            expect.objectContaining({
                example: "An apple a day helps.",
            }),
        ]);
        expect(mockGenerateDefinitionExamples).toHaveBeenCalledWith(baseResult.word, baseResult.meanings);
    });
});
