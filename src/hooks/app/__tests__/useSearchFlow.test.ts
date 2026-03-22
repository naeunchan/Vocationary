import { act, renderHook, waitFor } from "@testing-library/react-native";

import { getWordData } from "@/api/dictionary/getWordData";
import { fetchWordSuggestions } from "@/api/dictionary/wordSuggestionClient";
import { useSearchFlow } from "@/hooks/app/useSearchFlow";
import * as database from "@/services/database";
import type { WordResult } from "@/services/dictionary/types";

jest.mock("@/api/dictionary/getWordData", () => ({
    getWordData: jest.fn(),
}));

jest.mock("@/api/dictionary/wordSuggestionClient", () => ({
    fetchWordSuggestions: jest.fn(),
}));

jest.mock("@/api/dictionary/exampleGenerator", () => ({
    generateDefinitionExamples: jest.fn(),
}));

jest.mock("@/api/dictionary/getPronunciationAudio", () => ({
    prefetchPronunciationAudio: jest.fn(),
}));

jest.mock("@/utils/audio", () => ({
    prefetchRemoteAudio: jest.fn(),
}));

jest.mock("@/logging/logger", () => ({
    captureAppError: jest.fn(),
}));

jest.mock("@/services/database", () => ({
    clearSearchHistoryEntries: jest.fn(),
    getSearchHistoryEntries: jest.fn(),
    saveSearchHistoryEntries: jest.fn(),
}));

const mockGetWordData = getWordData as jest.MockedFunction<typeof getWordData>;
const mockFetchWordSuggestions = fetchWordSuggestions as jest.MockedFunction<typeof fetchWordSuggestions>;
const mockGetSearchHistoryEntries = database.getSearchHistoryEntries as jest.MockedFunction<
    typeof database.getSearchHistoryEntries
>;
const mockSaveSearchHistoryEntries = database.saveSearchHistoryEntries as jest.MockedFunction<
    typeof database.saveSearchHistoryEntries
>;

const baseResult: WordResult = {
    word: "apple",
    phonetic: "/ˈæp.əl/",
    meanings: [
        {
            partOfSpeech: "noun",
            definitions: [
                {
                    definition: "Fruit",
                    pendingExample: true,
                },
            ],
        },
    ],
};

describe("useSearchFlow", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetSearchHistoryEntries.mockResolvedValue([]);
        mockSaveSearchHistoryEntries.mockResolvedValue(undefined);
        mockFetchWordSuggestions.mockResolvedValue([]);
    });

    it("adds successful searches to recent history", async () => {
        mockGetWordData.mockResolvedValue({
            base: baseResult,
            examplesPromise: Promise.resolve([]),
        });

        const { result } = renderHook(() =>
            useSearchFlow({
                favorites: [],
                pronunciationAvailable: false,
            }),
        );

        await waitFor(() => {
            expect(mockGetSearchHistoryEntries).toHaveBeenCalled();
        });

        act(() => {
            result.current.onChangeSearchTerm("apple");
        });

        act(() => {
            result.current.onSubmitSearch();
        });

        await waitFor(() => {
            expect(result.current.recentSearches).toHaveLength(1);
        });

        expect(result.current.recentSearches[0]).toEqual(
            expect.objectContaining({
                term: "apple",
                mode: "en-en",
            }),
        );
        expect(mockSaveSearchHistoryEntries).toHaveBeenCalledWith([
            expect.objectContaining({
                term: "apple",
                mode: "en-en",
            }),
        ]);
    });

    it("ranks autocomplete suggestions from local and remote sources", async () => {
        jest.useFakeTimers();
        mockGetSearchHistoryEntries.mockResolvedValue([
            { term: "apple", mode: "en-en", searchedAt: "2026-03-22T00:00:00.000Z" },
            { term: "apply", mode: "en-en", searchedAt: "2026-03-22T01:00:00.000Z" },
        ]);
        mockFetchWordSuggestions.mockResolvedValue(["application", "apps"]);

        try {
            const { result } = renderHook(() =>
                useSearchFlow({
                    favorites: [],
                    pronunciationAvailable: false,
                }),
            );

            await waitFor(() => {
                expect(mockGetSearchHistoryEntries).toHaveBeenCalled();
            });

            act(() => {
                result.current.onChangeSearchTerm("app");
            });

            await act(async () => {
                jest.advanceTimersByTime(200);
                await Promise.resolve();
            });

            await waitFor(() => {
                expect(result.current.autocompleteSuggestions).toEqual(["apps", "apple", "apply", "application"]);
            });
        } finally {
            jest.useRealTimers();
        }
    });

    it("searches immediately when selecting an autocomplete suggestion", async () => {
        mockGetSearchHistoryEntries.mockResolvedValue([
            { term: "apple", mode: "en-en", searchedAt: "2026-03-22T00:00:00.000Z" },
        ]);
        mockGetWordData.mockResolvedValue({
            base: baseResult,
            examplesPromise: Promise.resolve([]),
        });

        const { result } = renderHook(() =>
            useSearchFlow({
                favorites: [],
                pronunciationAvailable: false,
            }),
        );

        await waitFor(() => {
            expect(mockGetSearchHistoryEntries).toHaveBeenCalled();
        });

        act(() => {
            result.current.onChangeSearchTerm("app");
        });

        await waitFor(() => {
            expect(result.current.autocompleteSuggestions).toEqual(["apple"]);
        });

        act(() => {
            result.current.onSelectAutocomplete("apple");
        });

        await waitFor(() => {
            expect(mockGetWordData).toHaveBeenCalledWith("apple");
        });

        expect(result.current.searchTerm).toBe("apple");
        expect(result.current.autocompleteSuggestions).toEqual([]);
    });
});
