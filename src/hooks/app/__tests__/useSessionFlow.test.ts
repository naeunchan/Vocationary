import { act, renderHook, waitFor } from "@testing-library/react-native";

import { type SearchFlowBridge, useSessionFlow } from "@/hooks/app/useSessionFlow";
import * as database from "@/services/database";
import type { FavoriteWordEntry } from "@/services/favorites/types";
import {
    GUEST_FAVORITES_PREFERENCE_KEY,
    GUEST_USED_PREFERENCE_KEY,
    ONBOARDING_PREFERENCE_KEY,
} from "@/theme/constants";

jest.mock("@/logging/logger", () => ({
    setUserContext: jest.fn(),
}));

jest.mock("@/services/backup/manualBackup", () => ({
    exportBackupToFile: jest.fn(),
    importBackupFromDocument: jest.fn(),
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
    initializeDatabase: jest.fn(),
    isDisplayNameTaken: jest.fn(),
    removeFavoriteForUser: jest.fn(),
    removeReviewProgressForUser: jest.fn(),
    resetPasswordWithEmailCode: jest.fn(),
    saveAutoLoginCredentials: jest.fn(),
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

const mockGetActiveSession = database.getActiveSession as jest.MockedFunction<typeof database.getActiveSession>;
const mockGetCollectionsByUser = database.getCollectionsByUser as jest.MockedFunction<
    typeof database.getCollectionsByUser
>;
const mockGetFavoritesByUser = database.getFavoritesByUser as jest.MockedFunction<typeof database.getFavoritesByUser>;
const mockGetPreferenceValue = database.getPreferenceValue as jest.MockedFunction<typeof database.getPreferenceValue>;
const mockGetReviewProgressByUser = database.getReviewProgressByUser as jest.MockedFunction<
    typeof database.getReviewProgressByUser
>;
const mockSetCollectionsForUser = database.setCollectionsForUser as jest.MockedFunction<
    typeof database.setCollectionsForUser
>;
const mockSetPreferenceValue = database.setPreferenceValue as jest.MockedFunction<typeof database.setPreferenceValue>;
const mockSetGuestSession = database.setGuestSession as jest.MockedFunction<typeof database.setGuestSession>;
const mockClearSession = database.clearSession as jest.MockedFunction<typeof database.clearSession>;
const mockFindUserByUsername = database.findUserByUsername as jest.MockedFunction<typeof database.findUserByUsername>;
const mockUpsertFavoriteForUser = database.upsertFavoriteForUser as jest.MockedFunction<
    typeof database.upsertFavoriteForUser
>;
const mockUpsertReviewProgressForUser = database.upsertReviewProgressForUser as jest.MockedFunction<
    typeof database.upsertReviewProgressForUser
>;
const mockImportBackupFromDocument = jest.requireMock("@/services/backup/manualBackup")
    .importBackupFromDocument as jest.Mock;

const searchBridge = (): { current: SearchFlowBridge | null } => ({
    current: {
        resetSearchState: jest.fn(),
        reloadRecentSearches: jest.fn().mockResolvedValue(undefined),
        setErrorMessage: jest.fn(),
        clearError: jest.fn(),
    },
});

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

const loggedInUser = {
    id: 1,
    username: "tester@example.com",
    displayName: "Tester",
    phoneNumber: null,
};

describe("useSessionFlow", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetActiveSession.mockResolvedValue(null);
        mockGetCollectionsByUser.mockResolvedValue([]);
        mockGetFavoritesByUser.mockResolvedValue([]);
        mockGetPreferenceValue.mockResolvedValue(null);
        mockGetReviewProgressByUser.mockResolvedValue({});
        mockSetCollectionsForUser.mockResolvedValue(undefined);
        mockSetPreferenceValue.mockResolvedValue(undefined);
        mockSetGuestSession.mockResolvedValue(undefined);
        mockClearSession.mockResolvedValue(undefined);
        mockFindUserByUsername.mockResolvedValue(null);
        mockUpsertFavoriteForUser.mockResolvedValue(undefined);
        mockUpsertReviewProgressForUser.mockResolvedValue(undefined);
        mockImportBackupFromDocument.mockResolvedValue({
            ok: true,
            code: "OK",
            restored: { users: 0, favorites: 0, searchHistory: 0 },
        });
    });

    it("merges guest favorites into the logged-in user during bootstrap", async () => {
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
            return null;
        });

        const bridgeRef = searchBridge();
        const syncOnboardingVisibilityAfterAuthentication = jest.fn().mockResolvedValue(undefined);
        const setOnboardingVisible = jest.fn();

        const { result } = renderHook(() =>
            useSessionFlow({
                searchFlowBridgeRef: bridgeRef as any,
                setOnboardingVisible,
                syncOnboardingVisibilityAfterAuthentication,
            }),
        );

        await waitFor(() => {
            expect(result.current.initializing).toBe(false);
        });

        expect(result.current.isAuthenticated).toBe(true);
        expect(result.current.favorites).toEqual([
            expect.objectContaining({ word: expect.objectContaining({ word: "apple" }) }),
            expect.objectContaining({ word: expect.objectContaining({ word: "banana" }) }),
        ]);
        expect(bridgeRef.current?.resetSearchState).toHaveBeenCalled();
        expect(mockSetPreferenceValue).toHaveBeenCalledWith(GUEST_FAVORITES_PREFERENCE_KEY, "[]");
        expect(syncOnboardingVisibilityAfterAuthentication).toHaveBeenCalled();
        expect(setOnboardingVisible).not.toHaveBeenCalled();
    });

    it("handles guest access and auth redirects", async () => {
        const bridgeRef = searchBridge();
        const setOnboardingVisible = jest.fn();
        const syncOnboardingVisibilityAfterAuthentication = jest.fn().mockResolvedValue(undefined);

        const { result } = renderHook(() =>
            useSessionFlow({
                searchFlowBridgeRef: bridgeRef as any,
                setOnboardingVisible,
                syncOnboardingVisibilityAfterAuthentication,
            }),
        );

        await waitFor(() => {
            expect(result.current.initializing).toBe(false);
        });

        act(() => {
            result.current.loginBindings.onGuest();
        });

        await waitFor(() => {
            expect(mockSetGuestSession).toHaveBeenCalled();
            expect(mockSetPreferenceValue).toHaveBeenCalledWith(GUEST_USED_PREFERENCE_KEY, "true");
            expect(setOnboardingVisible).toHaveBeenCalledWith(true);
            expect(result.current.isGuest).toBe(true);
        });

        act(() => {
            result.current.onRequestLogin();
        });

        await waitFor(() => {
            expect(mockClearSession).toHaveBeenCalled();
            expect(bridgeRef.current?.resetSearchState).toHaveBeenCalled();
            expect(result.current.isGuest).toBe(false);
        });
    });

    it("refreshes the current user and recent searches after backup import", async () => {
        mockGetActiveSession.mockResolvedValue({ isGuest: false, user: loggedInUser });
        mockFindUserByUsername.mockResolvedValue(loggedInUser as any);
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
            return null;
        });
        mockImportBackupFromDocument.mockResolvedValue({
            ok: true,
            code: "OK",
            restored: { users: 1, favorites: 1, searchHistory: 1 },
        });

        const bridgeRef = searchBridge();
        const syncOnboardingVisibilityAfterAuthentication = jest.fn().mockResolvedValue(undefined);
        const setOnboardingVisible = jest.fn();

        const { result } = renderHook(() =>
            useSessionFlow({
                searchFlowBridgeRef: bridgeRef as any,
                setOnboardingVisible,
                syncOnboardingVisibilityAfterAuthentication,
            }),
        );

        await waitFor(() => {
            expect(result.current.initializing).toBe(false);
        });

        await act(async () => {
            await result.current.onImportBackup("secret");
        });

        expect(mockImportBackupFromDocument).toHaveBeenCalledWith("secret");
        expect(bridgeRef.current?.reloadRecentSearches).toHaveBeenCalled();
        expect(mockFindUserByUsername).toHaveBeenCalledWith("tester@example.com");
    });

    it("applies review outcomes and persists review progress for authenticated users", async () => {
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
            return null;
        });

        const bridgeRef = searchBridge();
        const syncOnboardingVisibilityAfterAuthentication = jest.fn().mockResolvedValue(undefined);
        const setOnboardingVisible = jest.fn();

        const { result } = renderHook(() =>
            useSessionFlow({
                searchFlowBridgeRef: bridgeRef as any,
                setOnboardingVisible,
                syncOnboardingVisibilityAfterAuthentication,
            }),
        );

        await waitFor(() => {
            expect(result.current.initializing).toBe(false);
        });

        await act(async () => {
            await result.current.onApplyReviewOutcome("apple", "good");
        });

        expect(result.current.favorites).toEqual([
            expect.objectContaining({
                status: "review",
                word: expect.objectContaining({ word: "apple" }),
            }),
        ]);
        expect(result.current.reviewProgress).toEqual({
            apple: expect.objectContaining({
                word: "apple",
                reviewCount: 1,
                correctStreak: 1,
                incorrectCount: 0,
                lastOutcome: "good",
            }),
        });
        expect(mockUpsertFavoriteForUser).toHaveBeenCalledWith(
            loggedInUser.id,
            expect.objectContaining({ status: "review" }),
        );
        expect(mockUpsertReviewProgressForUser).toHaveBeenCalledWith(
            loggedInUser.id,
            expect.objectContaining({ word: "apple", lastOutcome: "good" }),
        );
    });

    it("creates collections and assigns saved words for authenticated users", async () => {
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
            return null;
        });

        const bridgeRef = searchBridge();
        const syncOnboardingVisibilityAfterAuthentication = jest.fn().mockResolvedValue(undefined);
        const setOnboardingVisible = jest.fn();

        const { result } = renderHook(() =>
            useSessionFlow({
                searchFlowBridgeRef: bridgeRef as any,
                setOnboardingVisible,
                syncOnboardingVisibilityAfterAuthentication,
            }),
        );

        await waitFor(() => {
            expect(result.current.initializing).toBe(false);
        });

        let collectionId: string | null = null;
        await act(async () => {
            collectionId = await result.current.onCreateCollection("TOEIC");
        });

        expect(result.current.collections).toEqual([expect.objectContaining({ name: "TOEIC" })]);

        await act(async () => {
            await result.current.onAssignWordToCollection("apple", collectionId);
        });

        expect(result.current.collectionMemberships).toEqual({ apple: collectionId });
        expect(mockSetCollectionsForUser).toHaveBeenLastCalledWith(
            loggedInUser.id,
            expect.arrayContaining([expect.objectContaining({ id: collectionId, wordKeys: ["apple"] })]),
        );
    });
});
