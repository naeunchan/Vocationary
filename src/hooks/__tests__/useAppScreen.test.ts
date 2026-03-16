import { act, renderHook, waitFor } from "@testing-library/react-native";

import { getWordData } from "@/api/dictionary/getWordData";
import { fetchWordSuggestions } from "@/api/dictionary/wordSuggestionClient";
import { createAppError } from "@/errors/AppError";
import { useAppScreen } from "@/hooks/useAppScreen";
import * as database from "@/services/database";
import type { WordResult } from "@/services/dictionary/types";

jest.mock("@/config/openAI", () => ({
    OPENAI_FEATURE_ENABLED: false,
}));

jest.mock("@/api/dictionary/getWordData", () => ({
    getWordData: jest.fn(),
}));

jest.mock("@/api/dictionary/wordSuggestionClient", () => ({
    fetchWordSuggestions: jest.fn(),
}));

jest.mock("@/api/dictionary/exampleGenerator", () => ({
    generateDefinitionExamples: jest.fn(),
}));

jest.mock("@/api/dictionary/freeDictionaryClient", () => ({
    fetchDictionaryEntry: jest.fn(),
}));

jest.mock("@/api/dictionary/getPronunciationAudio", () => ({
    getPronunciationAudio: jest.fn(),
    prefetchPronunciationAudio: jest.fn(),
}));

jest.mock("@/services/backup/manualBackup", () => ({
    exportBackupToFile: jest.fn(),
    importBackupFromDocument: jest.fn(),
}));

jest.mock("@/logging/logger", () => ({
    captureAppError: jest.fn(),
    setUserContext: jest.fn(),
}));

jest.mock("@/utils/audio", () => ({
    playRemoteAudio: jest.fn(),
    prefetchRemoteAudio: jest.fn(),
}));

jest.mock("@/services/database", () => ({
    clearAutoLoginCredentials: jest.fn(),
    clearSearchHistoryEntries: jest.fn(),
    clearSession: jest.fn(),
    createUser: jest.fn(),
    deleteUserAccount: jest.fn(),
    findUserByUsername: jest.fn(),
    getActiveSession: jest.fn(),
    getFavoritesByUser: jest.fn(),
    getPreferenceValue: jest.fn(),
    getSearchHistoryEntries: jest.fn(),
    initializeDatabase: jest.fn(),
    isDisplayNameTaken: jest.fn(),
    removeFavoriteForUser: jest.fn(),
    resetPasswordWithEmailCode: jest.fn(),
    saveAutoLoginCredentials: jest.fn(),
    saveSearchHistoryEntries: jest.fn(),
    sendEmailVerificationCode: jest.fn(),
    setGuestSession: jest.fn(),
    setPreferenceValue: jest.fn(),
    setUserSession: jest.fn(),
    updateUserDisplayName: jest.fn(),
    updateUserPassword: jest.fn(),
    upsertFavoriteForUser: jest.fn(),
    verifyPasswordHash: jest.fn(),
}));

const mockGetWordData = getWordData as jest.MockedFunction<typeof getWordData>;
const mockFetchWordSuggestions = fetchWordSuggestions as jest.MockedFunction<typeof fetchWordSuggestions>;
const mockGetActiveSession = database.getActiveSession as jest.MockedFunction<typeof database.getActiveSession>;
const mockGetPreferenceValue = database.getPreferenceValue as jest.MockedFunction<typeof database.getPreferenceValue>;
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

async function waitForHookReady(result: ReturnType<typeof renderHook<typeof useAppScreen>>["result"]) {
    await waitFor(() => {
        expect(result.current.initializing).toBe(false);
        expect(result.current.appearanceReady).toBe(true);
    });
}

describe("useAppScreen search history", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetActiveSession.mockResolvedValue(null);
        mockGetPreferenceValue.mockResolvedValue(null);
        mockGetSearchHistoryEntries.mockResolvedValue([]);
        mockSaveSearchHistoryEntries.mockResolvedValue(undefined);
        mockFetchWordSuggestions.mockResolvedValue([]);
    });

    it("adds successful searches to recent history", async () => {
        mockGetWordData.mockResolvedValue({
            base: baseResult,
            examplesPromise: Promise.resolve([]),
        });

        const { result } = renderHook(() => useAppScreen());
        await waitForHookReady(result);

        act(() => {
            result.current.navigatorProps.onChangeSearchTerm("apple");
        });

        act(() => {
            result.current.navigatorProps.onSubmitSearch();
        });

        await waitFor(() => {
            expect(result.current.navigatorProps.recentSearches).toHaveLength(1);
        });

        expect(result.current.navigatorProps.recentSearches[0]).toEqual(
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

    it("does not add missing words to recent history", async () => {
        mockGetWordData.mockRejectedValue(
            createAppError("ValidationError", "철자를 다시 확인하거나 다른 단어로 검색해 보세요.", {
                code: "DICTIONARY_NOT_FOUND",
                retryable: false,
            }),
        );

        const { result } = renderHook(() => useAppScreen());
        await waitForHookReady(result);

        act(() => {
            result.current.navigatorProps.onChangeSearchTerm("vocationary");
        });

        act(() => {
            result.current.navigatorProps.onSubmitSearch();
        });

        await waitFor(() => {
            expect(result.current.navigatorProps.error?.code).toBe("DICTIONARY_NOT_FOUND");
        });

        expect(result.current.navigatorProps.recentSearches).toEqual([]);
        expect(mockSaveSearchHistoryEntries).not.toHaveBeenCalled();
    });

    it("shows autocomplete suggestions from recent searches", async () => {
        mockGetSearchHistoryEntries.mockResolvedValue([
            { term: "apple", mode: "en-en", searchedAt: "2024-01-01T00:00:00.000Z" },
            { term: "apricot", mode: "en-en", searchedAt: "2024-01-02T00:00:00.000Z" },
        ]);

        const { result } = renderHook(() => useAppScreen());
        await waitForHookReady(result);

        act(() => {
            result.current.navigatorProps.onChangeSearchTerm("app");
        });

        await waitFor(() => {
            expect(result.current.navigatorProps.autocompleteSuggestions).toEqual(["apple"]);
        });
    });

    it("ranks autocomplete suggestions by similarity first and shorter words next", async () => {
        mockGetSearchHistoryEntries.mockResolvedValue([
            { term: "apple", mode: "en-en", searchedAt: "2024-01-01T00:00:00.000Z" },
            { term: "apps", mode: "en-en", searchedAt: "2024-01-02T00:00:00.000Z" },
            { term: "application", mode: "en-en", searchedAt: "2024-01-03T00:00:00.000Z" },
            { term: "apply", mode: "en-en", searchedAt: "2024-01-04T00:00:00.000Z" },
        ]);

        const { result } = renderHook(() => useAppScreen());
        await waitForHookReady(result);

        act(() => {
            result.current.navigatorProps.onChangeSearchTerm("app");
        });

        await waitFor(() => {
            expect(result.current.navigatorProps.autocompleteSuggestions).toEqual([
                "apps",
                "apple",
                "apply",
                "application",
            ]);
        });
    });

    it("searches immediately when selecting an autocomplete suggestion", async () => {
        mockGetSearchHistoryEntries.mockResolvedValue([
            { term: "apple", mode: "en-en", searchedAt: "2024-01-01T00:00:00.000Z" },
        ]);
        mockGetWordData.mockResolvedValue({
            base: baseResult,
            examplesPromise: Promise.resolve([]),
        });

        const { result } = renderHook(() => useAppScreen());
        await waitForHookReady(result);

        act(() => {
            result.current.navigatorProps.onChangeSearchTerm("app");
        });

        await waitFor(() => {
            expect(result.current.navigatorProps.autocompleteSuggestions).toEqual(["apple"]);
        });

        act(() => {
            result.current.navigatorProps.onSelectAutocomplete("apple");
        });

        await waitFor(() => {
            expect(mockGetWordData).toHaveBeenCalledWith("apple");
        });

        expect(result.current.navigatorProps.searchTerm).toBe("apple");
        expect(result.current.navigatorProps.autocompleteSuggestions).toEqual([]);
    });

    it("keeps remote autocomplete suggestions stable without refetch flicker", async () => {
        jest.useFakeTimers();
        mockFetchWordSuggestions.mockResolvedValue(["apple", "application"]);

        try {
            const { result } = renderHook(() => useAppScreen());
            await waitForHookReady(result);

            act(() => {
                result.current.navigatorProps.onChangeSearchTerm("app");
            });

            await act(async () => {
                jest.advanceTimersByTime(200);
                await Promise.resolve();
            });

            await waitFor(() => {
                expect(result.current.navigatorProps.autocompleteSuggestions).toEqual(["apple", "application"]);
            });

            await act(async () => {
                jest.advanceTimersByTime(400);
                await Promise.resolve();
            });

            expect(mockFetchWordSuggestions).toHaveBeenCalledTimes(1);
            expect(result.current.navigatorProps.autocompleteSuggestions).toEqual(["apple", "application"]);
            expect(result.current.navigatorProps.autocompleteLoading).toBe(false);
        } finally {
            jest.useRealTimers();
        }
    });

    it("reorders remote autocomplete suggestions by similarity and shorter length", async () => {
        jest.useFakeTimers();
        mockFetchWordSuggestions.mockResolvedValue(["application", "apply", "apple", "apps"]);

        try {
            const { result } = renderHook(() => useAppScreen());
            await waitForHookReady(result);

            act(() => {
                result.current.navigatorProps.onChangeSearchTerm("app");
            });

            await act(async () => {
                jest.advanceTimersByTime(200);
                await Promise.resolve();
            });

            await waitFor(() => {
                expect(result.current.navigatorProps.autocompleteSuggestions).toEqual([
                    "apps",
                    "apple",
                    "apply",
                    "application",
                ]);
            });
        } finally {
            jest.useRealTimers();
        }
    });
});
