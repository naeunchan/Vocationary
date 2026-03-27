import { act, renderHook, waitFor } from "@testing-library/react-native";

import { getAIProxyHealth } from "@/api/dictionary/aiHealth";
import { generateDefinitionExamples } from "@/api/dictionary/exampleGenerator";
import { prefetchPronunciationAudio } from "@/api/dictionary/getPronunciationAudio";
import { getWordData } from "@/api/dictionary/getWordData";
import { fetchWordSuggestions } from "@/api/dictionary/wordSuggestionClient";
import { useSearchFlow } from "@/hooks/app/useSearchFlow";
import * as database from "@/services/database";
import type { WordResult } from "@/services/dictionary/types";
import { prefetchRemoteAudio } from "@/utils/audio";

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

jest.mock("@/api/dictionary/aiHealth", () => ({
    getAIProxyHealth: jest.fn(),
    isBackgroundAIWarmupAllowed: jest.fn((health: { status?: string }) => health.status === "ok"),
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
const mockGenerateDefinitionExamples = generateDefinitionExamples as jest.MockedFunction<
    typeof generateDefinitionExamples
>;
const mockFetchWordSuggestions = fetchWordSuggestions as jest.MockedFunction<typeof fetchWordSuggestions>;
const mockGetSearchHistoryEntries = database.getSearchHistoryEntries as jest.MockedFunction<
    typeof database.getSearchHistoryEntries
>;
const mockGetAIProxyHealth = getAIProxyHealth as jest.MockedFunction<typeof getAIProxyHealth>;
const mockPrefetchPronunciationAudio = prefetchPronunciationAudio as jest.MockedFunction<
    typeof prefetchPronunciationAudio
>;
const mockPrefetchRemoteAudio = prefetchRemoteAudio as jest.MockedFunction<typeof prefetchRemoteAudio>;
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
        mockGetAIProxyHealth.mockResolvedValue({
            status: "ok",
            checkedAt: Date.now(),
        });
        mockSaveSearchHistoryEntries.mockResolvedValue(undefined);
        mockFetchWordSuggestions.mockResolvedValue([]);
        mockGenerateDefinitionExamples.mockResolvedValue([]);
        mockPrefetchPronunciationAudio.mockResolvedValue("file://cached-audio.mp3");
        mockPrefetchRemoteAudio.mockResolvedValue(undefined);
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

    it("loads AI examples only after the user opens the example panel", async () => {
        mockGetWordData.mockResolvedValue({
            base: {
                ...baseResult,
                meanings: [
                    {
                        partOfSpeech: "noun",
                        definitions: [{ definition: "Fruit" }],
                    },
                ],
            },
            examplesPromise: Promise.resolve([]),
        });
        mockGenerateDefinitionExamples.mockResolvedValue([
            {
                meaningIndex: 0,
                definitionIndex: 0,
                example: "An apple a day helps.",
            },
        ]);

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
            expect(result.current.result?.word).toBe("apple");
        });

        expect(mockGenerateDefinitionExamples).not.toHaveBeenCalled();

        act(() => {
            result.current.onToggleExamples();
        });

        await waitFor(() => {
            expect(result.current.result?.meanings[0]?.definitions[0]?.example).toBe("An apple a day helps.");
        });

        expect(mockGenerateDefinitionExamples).toHaveBeenCalledWith(
            "apple",
            expect.any(Array),
            expect.objectContaining({ forceFresh: false }),
        );
    });

    it("delays pronunciation warmup and cancels it when the query changes", async () => {
        jest.useFakeTimers();
        mockGetWordData.mockResolvedValue({
            base: baseResult,
            examplesPromise: Promise.resolve([]),
        });

        try {
            const { result } = renderHook(() =>
                useSearchFlow({
                    favorites: [],
                    pronunciationAvailable: true,
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
                expect(result.current.result?.word).toBe("apple");
            });

            act(() => {
                jest.advanceTimersByTime(1000);
            });

            expect(mockPrefetchPronunciationAudio).not.toHaveBeenCalled();

            act(() => {
                result.current.onChangeSearchTerm("banana");
                jest.advanceTimersByTime(1000);
            });

            expect(mockPrefetchPronunciationAudio).not.toHaveBeenCalled();
            expect(mockPrefetchRemoteAudio).not.toHaveBeenCalled();
        } finally {
            jest.useRealTimers();
        }
    });

    it("skips pronunciation warmup when AI proxy health is degraded", async () => {
        jest.useFakeTimers();
        mockGetWordData.mockResolvedValue({
            base: baseResult,
            examplesPromise: Promise.resolve([]),
        });
        mockGetAIProxyHealth.mockResolvedValue({
            status: "degraded",
            checkedAt: Date.now(),
            lastFailureAt: Date.now(),
            lastFailureRoute: "/dictionary/tts",
        });

        try {
            const { result } = renderHook(() =>
                useSearchFlow({
                    favorites: [],
                    pronunciationAvailable: true,
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
                expect(result.current.result?.word).toBe("apple");
            });

            await act(async () => {
                jest.advanceTimersByTime(1300);
                await Promise.resolve();
            });

            expect(mockPrefetchPronunciationAudio).not.toHaveBeenCalled();
            expect(mockPrefetchRemoteAudio).not.toHaveBeenCalled();
        } finally {
            jest.useRealTimers();
        }
    });
});
