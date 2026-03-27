import { act, renderHook, waitFor } from "@testing-library/react-native";

import { getWordData } from "@/api/dictionary/getWordData";
import { fetchWordSuggestions } from "@/api/dictionary/wordSuggestionClient";
import { FEATURE_FLAGS } from "@/config/featureFlags";
import { createAppError } from "@/errors/AppError";
import { useAppScreen } from "@/hooks/useAppScreen";
import * as database from "@/services/database";
import type { WordResult } from "@/services/dictionary/types";
import type { FavoriteWordEntry } from "@/services/favorites/types";
import { DAILY_GOAL_SETTINGS_PREFERENCE_KEY, REVIEW_STREAK_STATE_PREFERENCE_KEY } from "@/services/goals";
import { REVIEW_REMINDER_SETTINGS_PREFERENCE_KEY } from "@/services/notifications";
import {
    FONT_SCALE_PREFERENCE_KEY,
    GUEST_FAVORITES_PREFERENCE_KEY,
    GUEST_USED_PREFERENCE_KEY,
    ONBOARDING_PREFERENCE_KEY,
    THEME_MODE_PREFERENCE_KEY,
} from "@/theme/constants";

jest.mock("@/config/openAI", () => ({
    OPENAI_FEATURE_ENABLED: true,
}));

jest.mock("@/config/featureFlags", () => ({
    FEATURE_FLAGS: {
        accountAuth: true,
        guestAccountCta: false,
        backupRestore: false,
        reviewLoop: true,
        reviewHomeDashboard: true,
        reviewSessionUi: true,
        dailyGoal: false,
        reviewReminder: false,
        collections: true,
        favoritesBatchActions: false,
        aiStudyMode: true,
        aiStudyEntryPoints: true,
        aiStudySessionUi: true,
    },
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
    invalidatePronunciationAudioCache: jest.fn(),
    prefetchPronunciationAudio: jest.fn(),
}));

jest.mock("@/services/backup/manualBackup", () => ({
    exportBackupToFile: jest.fn(),
    importBackupFromDocument: jest.fn(),
}));

jest.mock("@/services/study", () => {
    const actual = jest.requireActual("@/services/study");
    return {
        ...actual,
        loadAIStudySession: jest.fn(),
    };
});

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
    getCollectionsByUser: jest.fn(),
    getFavoritesByUser: jest.fn(),
    getPreferenceValue: jest.fn(),
    getReviewProgressByUser: jest.fn(),
    getSearchHistoryEntries: jest.fn(),
    initializeDatabase: jest.fn(),
    isDisplayNameTaken: jest.fn(),
    removeFavoriteForUser: jest.fn(),
    removeReviewProgressForUser: jest.fn(),
    resetPasswordWithEmailCode: jest.fn(),
    saveAutoLoginCredentials: jest.fn(),
    saveSearchHistoryEntries: jest.fn(),
    sendEmailVerificationCode: jest.fn(),
    setCollectionsForUser: jest.fn(),
    setGuestSession: jest.fn(),
    setPreferenceValue: jest.fn(),
    setUserSession: jest.fn(),
    updateUserDisplayName: jest.fn(),
    updateUserPassword: jest.fn(),
    upsertFavoriteForUser: jest.fn(),
    upsertReviewProgressForUser: jest.fn(),
    verifyPasswordHash: jest.fn(),
}));

const mockGetWordData = getWordData as jest.MockedFunction<typeof getWordData>;
const mockFetchWordSuggestions = fetchWordSuggestions as jest.MockedFunction<typeof fetchWordSuggestions>;
const mockGetActiveSession = database.getActiveSession as jest.MockedFunction<typeof database.getActiveSession>;
const mockFindUserByUsername = database.findUserByUsername as jest.MockedFunction<typeof database.findUserByUsername>;
const mockGetCollectionsByUser = database.getCollectionsByUser as jest.MockedFunction<
    typeof database.getCollectionsByUser
>;
const mockGetFavoritesByUser = database.getFavoritesByUser as jest.MockedFunction<typeof database.getFavoritesByUser>;
const mockGetPreferenceValue = database.getPreferenceValue as jest.MockedFunction<typeof database.getPreferenceValue>;
const mockGetReviewProgressByUser = database.getReviewProgressByUser as jest.MockedFunction<
    typeof database.getReviewProgressByUser
>;
const mockGetSearchHistoryEntries = database.getSearchHistoryEntries as jest.MockedFunction<
    typeof database.getSearchHistoryEntries
>;
const mockSaveSearchHistoryEntries = database.saveSearchHistoryEntries as jest.MockedFunction<
    typeof database.saveSearchHistoryEntries
>;
const mockSetPreferenceValue = database.setPreferenceValue as jest.MockedFunction<typeof database.setPreferenceValue>;
const mockUpsertFavoriteForUser = database.upsertFavoriteForUser as jest.MockedFunction<
    typeof database.upsertFavoriteForUser
>;
const mockUpsertReviewProgressForUser = database.upsertReviewProgressForUser as jest.MockedFunction<
    typeof database.upsertReviewProgressForUser
>;
const mockImportBackupFromDocument = jest.requireMock("@/services/backup/manualBackup")
    .importBackupFromDocument as jest.Mock;
const mockLoadAIStudySession = jest.requireMock("@/services/study").loadAIStudySession as jest.Mock;

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

const loggedInUser = {
    id: 1,
    username: "tester@example.com",
    displayName: "Tester",
    phoneNumber: null,
};

function createFavorite(word: string, updatedAt: string): FavoriteWordEntry {
    return {
        word: {
            word,
            phonetic: `/${word}/`,
            meanings: [
                {
                    partOfSpeech: "noun",
                    definitions: [
                        {
                            definition: `${word} definition`,
                            pendingExample: true,
                        },
                    ],
                },
            ],
        },
        status: "toMemorize",
        updatedAt,
    };
}

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
        mockFindUserByUsername.mockResolvedValue(null);
        mockGetCollectionsByUser.mockResolvedValue([]);
        mockGetFavoritesByUser.mockResolvedValue([]);
        mockGetPreferenceValue.mockResolvedValue(null);
        mockGetReviewProgressByUser.mockResolvedValue({});
        mockGetSearchHistoryEntries.mockResolvedValue([]);
        mockSaveSearchHistoryEntries.mockResolvedValue(undefined);
        mockSetPreferenceValue.mockResolvedValue(undefined);
        mockUpsertFavoriteForUser.mockResolvedValue(undefined);
        mockUpsertReviewProgressForUser.mockResolvedValue(undefined);
        mockImportBackupFromDocument.mockResolvedValue({
            ok: true,
            code: "OK",
            restored: { users: 0, favorites: 0, searchHistory: 0 },
        });
        FEATURE_FLAGS.dailyGoal = false;
        FEATURE_FLAGS.reviewReminder = false;
        mockLoadAIStudySession.mockReset();
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
            result.current.navigatorProps.search.onChangeSearchTerm("apple");
        });

        act(() => {
            result.current.navigatorProps.search.onSubmit();
        });

        await waitFor(() => {
            expect(result.current.navigatorProps.search.recentSearches).toHaveLength(1);
        });

        expect(result.current.navigatorProps.search.recentSearches[0]).toEqual(
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
            result.current.navigatorProps.search.onChangeSearchTerm("vocationary");
        });

        act(() => {
            result.current.navigatorProps.search.onSubmit();
        });

        await waitFor(() => {
            expect(result.current.navigatorProps.search.error?.code).toBe("DICTIONARY_NOT_FOUND");
        });

        expect(result.current.navigatorProps.search.recentSearches).toEqual([]);
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
            result.current.navigatorProps.search.onChangeSearchTerm("app");
        });

        await waitFor(() => {
            expect(result.current.navigatorProps.search.autocompleteSuggestions).toEqual(["apple"]);
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
            result.current.navigatorProps.search.onChangeSearchTerm("app");
        });

        await waitFor(() => {
            expect(result.current.navigatorProps.search.autocompleteSuggestions).toEqual([
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
            result.current.navigatorProps.search.onChangeSearchTerm("app");
        });

        await waitFor(() => {
            expect(result.current.navigatorProps.search.autocompleteSuggestions).toEqual(["apple"]);
        });

        act(() => {
            result.current.navigatorProps.search.onSelectAutocomplete("apple");
        });

        await waitFor(() => {
            expect(mockGetWordData).toHaveBeenCalledWith("apple");
        });

        expect(result.current.navigatorProps.search.searchTerm).toBe("apple");
        expect(result.current.navigatorProps.search.autocompleteSuggestions).toEqual([]);
    });

    it("keeps remote autocomplete suggestions stable without refetch flicker", async () => {
        jest.useFakeTimers();
        mockFetchWordSuggestions.mockResolvedValue(["apple", "application"]);

        try {
            const { result } = renderHook(() => useAppScreen());
            await waitForHookReady(result);

            act(() => {
                result.current.navigatorProps.search.onChangeSearchTerm("app");
            });

            await act(async () => {
                jest.advanceTimersByTime(200);
                await Promise.resolve();
            });

            await waitFor(() => {
                expect(result.current.navigatorProps.search.autocompleteSuggestions).toEqual(["apple", "application"]);
            });

            await act(async () => {
                jest.advanceTimersByTime(400);
                await Promise.resolve();
            });

            expect(mockFetchWordSuggestions).toHaveBeenCalledTimes(1);
            expect(result.current.navigatorProps.search.autocompleteSuggestions).toEqual(["apple", "application"]);
            expect(result.current.navigatorProps.search.autocompleteLoading).toBe(false);
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
                result.current.navigatorProps.search.onChangeSearchTerm("app");
            });

            await act(async () => {
                jest.advanceTimersByTime(200);
                await Promise.resolve();
            });

            await waitFor(() => {
                expect(result.current.navigatorProps.search.autocompleteSuggestions).toEqual([
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

    it("merges guest favorites into the logged-in user's favorites on bootstrap", async () => {
        mockGetActiveSession.mockResolvedValue({ isGuest: false, user: loggedInUser });
        mockGetFavoritesByUser.mockResolvedValue([createFavorite("banana", "2026-03-22T00:00:00.000Z")]);
        mockGetPreferenceValue.mockImplementation(async (key: string) => {
            if (key === GUEST_FAVORITES_PREFERENCE_KEY) {
                return JSON.stringify([createFavorite("apple", "2026-03-22T01:00:00.000Z")]);
            }
            if (key === ONBOARDING_PREFERENCE_KEY) {
                return "true";
            }
            if (key === GUEST_USED_PREFERENCE_KEY) {
                return "false";
            }
            if (key === THEME_MODE_PREFERENCE_KEY) {
                return null;
            }
            if (key === FONT_SCALE_PREFERENCE_KEY) {
                return null;
            }
            return null;
        });

        const { result } = renderHook(() => useAppScreen());
        await waitForHookReady(result);

        expect(result.current.navigatorProps.home.favorites).toEqual([
            expect.objectContaining({ word: expect.objectContaining({ word: "apple" }) }),
            expect.objectContaining({ word: expect.objectContaining({ word: "banana" }) }),
        ]);
        expect(mockUpsertFavoriteForUser).toHaveBeenCalledWith(
            loggedInUser.id,
            expect.objectContaining({ word: expect.objectContaining({ word: "apple" }) }),
        );
        expect(mockUpsertFavoriteForUser).toHaveBeenCalledWith(
            loggedInUser.id,
            expect.objectContaining({ word: expect.objectContaining({ word: "banana" }) }),
        );
        expect(mockSetPreferenceValue).toHaveBeenCalledWith(GUEST_FAVORITES_PREFERENCE_KEY, "[]");
    });

    it("starts a review session from Home and applies the selected outcome", async () => {
        mockGetActiveSession.mockResolvedValue({ isGuest: false, user: loggedInUser });
        mockGetFavoritesByUser.mockResolvedValue([createFavorite("apple", "2026-03-22T00:00:00.000Z")]);
        mockGetPreferenceValue.mockImplementation(async (key: string) => {
            if (key === GUEST_FAVORITES_PREFERENCE_KEY) {
                return "[]";
            }
            if (key === ONBOARDING_PREFERENCE_KEY) {
                return "true";
            }
            if (key === GUEST_USED_PREFERENCE_KEY) {
                return "false";
            }
            if (key === THEME_MODE_PREFERENCE_KEY) {
                return null;
            }
            if (key === FONT_SCALE_PREFERENCE_KEY) {
                return null;
            }
            return null;
        });

        const { result } = renderHook(() => useAppScreen());
        await waitForHookReady(result);

        act(() => {
            result.current.navigatorProps.home.onStartReviewSession();
        });

        expect(result.current.navigatorProps.home.reviewSession).toMatchObject({
            status: "active",
            currentItem: expect.objectContaining({
                entry: expect.objectContaining({
                    word: expect.objectContaining({ word: "apple" }),
                }),
            }),
        });

        await act(async () => {
            result.current.navigatorProps.home.onApplyReviewOutcome("easy");
            await Promise.resolve();
        });

        await waitFor(() => {
            expect(result.current.navigatorProps.home.reviewSession).toMatchObject({
                status: "complete",
                completedCount: 1,
                correctCount: 1,
                incorrectCount: 0,
            });
        });

        expect(mockUpsertFavoriteForUser).toHaveBeenCalledWith(
            loggedInUser.id,
            expect.objectContaining({
                status: "review",
                word: expect.objectContaining({ word: "apple" }),
            }),
        );
        expect(mockUpsertReviewProgressForUser).toHaveBeenCalledWith(
            loggedInUser.id,
            expect.objectContaining({
                word: "apple",
                lastOutcome: "easy",
            }),
        );
    });

    it("keeps onboarding hidden after guest conversion has already been completed", async () => {
        mockGetActiveSession.mockResolvedValue({ isGuest: false, user: loggedInUser });
        mockGetPreferenceValue.mockImplementation(async (key: string) => {
            if (key === GUEST_FAVORITES_PREFERENCE_KEY) {
                return "[]";
            }
            if (key === ONBOARDING_PREFERENCE_KEY) {
                return "false";
            }
            if (key === GUEST_USED_PREFERENCE_KEY) {
                return "true";
            }
            if (key === THEME_MODE_PREFERENCE_KEY) {
                return null;
            }
            if (key === FONT_SCALE_PREFERENCE_KEY) {
                return null;
            }
            return null;
        });

        const { result } = renderHook(() => useAppScreen());
        await waitForHookReady(result);

        expect(result.current.isOnboardingVisible).toBe(false);
        expect(mockSetPreferenceValue).toHaveBeenCalledWith(ONBOARDING_PREFERENCE_KEY, "true");
    });

    it("refreshes the active user's favorites and search history after backup import", async () => {
        mockGetActiveSession.mockResolvedValue({ isGuest: false, user: loggedInUser });
        mockFindUserByUsername.mockResolvedValue(loggedInUser as any);
        mockGetFavoritesByUser
            .mockResolvedValueOnce([createFavorite("banana", "2026-03-22T00:00:00.000Z")])
            .mockResolvedValueOnce([createFavorite("apple", "2026-03-22T02:00:00.000Z")]);
        mockGetSearchHistoryEntries
            .mockResolvedValueOnce([{ term: "banana", mode: "en-en", searchedAt: "2026-03-22T00:00:00.000Z" }])
            .mockResolvedValueOnce([{ term: "apple", mode: "en-en", searchedAt: "2026-03-22T02:00:00.000Z" }]);
        mockGetPreferenceValue.mockImplementation(async (key: string) => {
            if (key === GUEST_FAVORITES_PREFERENCE_KEY) {
                return "[]";
            }
            if (key === ONBOARDING_PREFERENCE_KEY) {
                return "true";
            }
            if (key === GUEST_USED_PREFERENCE_KEY) {
                return "false";
            }
            if (key === THEME_MODE_PREFERENCE_KEY) {
                return null;
            }
            if (key === FONT_SCALE_PREFERENCE_KEY) {
                return null;
            }
            return null;
        });
        mockImportBackupFromDocument.mockResolvedValue({
            ok: true,
            code: "OK",
            restored: { users: 1, favorites: 1, searchHistory: 1 },
        });

        const { result } = renderHook(() => useAppScreen());
        await waitForHookReady(result);

        await act(async () => {
            await result.current.navigatorProps.settings.onImportBackup("secret");
        });

        await waitFor(() => {
            expect(result.current.navigatorProps.home.favorites).toEqual([
                expect.objectContaining({ word: expect.objectContaining({ word: "apple" }) }),
            ]);
        });
        expect(result.current.navigatorProps.search.recentSearches).toEqual([
            expect.objectContaining({ term: "apple" }),
        ]);
        expect(mockFindUserByUsername).toHaveBeenCalledWith("tester@example.com");
        expect(mockGetFavoritesByUser).toHaveBeenCalledTimes(2);
        expect(mockGetSearchHistoryEntries).toHaveBeenCalledTimes(2);
        expect(mockImportBackupFromDocument).toHaveBeenCalledWith("secret");
    });

    it("wires collection props into search and favorites when collections are available", async () => {
        mockGetActiveSession.mockResolvedValue({ isGuest: false, user: loggedInUser });
        mockGetFavoritesByUser.mockResolvedValue([createFavorite("apple", "2026-03-22T00:00:00.000Z")]);
        mockGetCollectionsByUser.mockResolvedValue([
            {
                id: "toeic",
                name: "TOEIC",
                createdAt: "2026-03-22T00:00:00.000Z",
                updatedAt: "2026-03-22T00:00:00.000Z",
                wordKeys: ["apple"],
            },
        ]);
        mockGetPreferenceValue.mockImplementation(async (key: string) => {
            if (key === GUEST_FAVORITES_PREFERENCE_KEY) {
                return "[]";
            }
            if (key === ONBOARDING_PREFERENCE_KEY) {
                return "true";
            }
            if (key === GUEST_USED_PREFERENCE_KEY) {
                return "false";
            }
            if (key === THEME_MODE_PREFERENCE_KEY) {
                return null;
            }
            if (key === FONT_SCALE_PREFERENCE_KEY) {
                return null;
            }
            return null;
        });
        mockGetWordData.mockResolvedValue({
            base: baseResult,
            examplesPromise: Promise.resolve([]),
        });

        const { result } = renderHook(() => useAppScreen());
        await waitForHookReady(result);

        act(() => {
            result.current.navigatorProps.search.onChangeSearchTerm("apple");
        });

        act(() => {
            result.current.navigatorProps.search.onSubmit();
        });

        await waitFor(() => {
            expect(result.current.navigatorProps.search.currentCollectionId).toBe("toeic");
        });

        expect(result.current.navigatorProps.search.collectionsEnabled).toBe(true);
        expect(result.current.navigatorProps.search.collections).toEqual([
            expect.objectContaining({ id: "toeic", name: "TOEIC" }),
        ]);
        expect(result.current.navigatorProps.favorites.collectionMemberships).toEqual({ apple: "toeic" });
    });

    it("starts an AI study session from search and advances to completion", async () => {
        mockGetWordData.mockResolvedValue({
            base: baseResult,
            examplesPromise: Promise.resolve([]),
        });
        mockLoadAIStudySession.mockResolvedValue({
            word: "apple",
            generatedAt: Date.now(),
            cards: [
                {
                    id: "card-1",
                    type: "cloze",
                    prompt: "Stay ____.",
                    choices: [
                        { id: "a", label: "apple", value: "apple" },
                        { id: "b", label: "banana", value: "banana" },
                    ],
                    answer: "apple",
                    explanation: "문맥상 apple이 맞아요.",
                },
            ],
        });

        const { result } = renderHook(() => useAppScreen());
        await waitForHookReady(result);

        act(() => {
            result.current.navigatorProps.search.onChangeSearchTerm("apple");
        });

        act(() => {
            result.current.navigatorProps.search.onSubmit();
        });

        await waitFor(() => {
            expect(result.current.navigatorProps.search.result?.word).toBe("apple");
        });

        act(() => {
            result.current.navigatorProps.search.onStartStudyMode(result.current.navigatorProps.search.result!);
        });

        await waitFor(() => {
            expect(result.current.navigatorProps.search.studySession?.status).toBe("active");
        });

        act(() => {
            result.current.navigatorProps.search.onSelectStudyChoice("apple");
        });

        expect(result.current.navigatorProps.search.studySession).toEqual(
            expect.objectContaining({
                status: "active",
                selectedAnswer: "apple",
                isCurrentAnswerCorrect: true,
            }),
        );

        act(() => {
            result.current.navigatorProps.search.onAdvanceStudyCard();
        });

        expect(result.current.navigatorProps.search.studySession).toEqual(
            expect.objectContaining({
                status: "complete",
                correctCount: 1,
                totalCount: 1,
            }),
        );
    });

    it("exposes daily goal and reminder state through home and settings props", async () => {
        FEATURE_FLAGS.dailyGoal = true;
        FEATURE_FLAGS.reviewReminder = true;
        mockGetActiveSession.mockResolvedValue({ isGuest: false, user: loggedInUser });
        mockGetFavoritesByUser.mockResolvedValue([createFavorite("apple", "2026-03-22T00:00:00.000Z")]);
        mockGetReviewProgressByUser.mockResolvedValue({
            apple: {
                word: "apple",
                lastReviewedAt: new Date().toISOString(),
                nextReviewAt: null,
                reviewCount: 1,
                correctStreak: 1,
                incorrectCount: 0,
                lastOutcome: "good",
            },
        });
        mockGetPreferenceValue.mockImplementation(async (key: string) => {
            if (key === GUEST_FAVORITES_PREFERENCE_KEY) {
                return "[]";
            }
            if (key === ONBOARDING_PREFERENCE_KEY) {
                return "true";
            }
            if (key === GUEST_USED_PREFERENCE_KEY) {
                return "false";
            }
            if (key === THEME_MODE_PREFERENCE_KEY) {
                return null;
            }
            if (key === FONT_SCALE_PREFERENCE_KEY) {
                return null;
            }
            if (key === DAILY_GOAL_SETTINGS_PREFERENCE_KEY) {
                return JSON.stringify({
                    enabled: true,
                    targetCount: 5,
                    updatedAt: "2026-03-27T00:00:00.000Z",
                });
            }
            if (key === REVIEW_STREAK_STATE_PREFERENCE_KEY) {
                return JSON.stringify({
                    currentStreak: 2,
                    longestStreak: 5,
                    lastCompletedDate: "2026-03-26",
                });
            }
            if (key === REVIEW_REMINDER_SETTINGS_PREFERENCE_KEY) {
                return JSON.stringify({
                    enabled: true,
                    hour: 20,
                    minute: 0,
                    weekdays: [1, 2, 3, 4, 5],
                    updatedAt: "2026-03-27T00:00:00.000Z",
                });
            }
            return null;
        });

        const { result } = renderHook(() => useAppScreen());
        await waitForHookReady(result);

        await waitFor(() => {
            expect(result.current.navigatorProps.home.goalSummary).toEqual(
                expect.objectContaining({
                    showGoal: true,
                    progress: expect.objectContaining({
                        completedCount: 1,
                        targetCount: 5,
                        remainingCount: 4,
                    }),
                    streak: expect.objectContaining({
                        currentStreak: 2,
                        longestStreak: 5,
                    }),
                    reminderLabel: "오후 8:00",
                }),
            );
        });

        act(() => {
            result.current.navigatorProps.settings.onSelectDailyGoalTarget(20);
            result.current.navigatorProps.settings.onToggleReviewReminder(false);
        });

        await waitFor(() => {
            expect(mockSetPreferenceValue).toHaveBeenCalledWith(
                DAILY_GOAL_SETTINGS_PREFERENCE_KEY,
                expect.stringContaining('"targetCount":20'),
            );
        });
        expect(mockSetPreferenceValue).toHaveBeenCalledWith(
            REVIEW_REMINDER_SETTINGS_PREFERENCE_KEY,
            expect.stringContaining('"enabled":false'),
        );
    });
});
