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
    getFavoritesByUser: jest.fn(),
    getPreferenceValue: jest.fn(),
    initializeDatabase: jest.fn(),
    isDisplayNameTaken: jest.fn(),
    removeFavoriteForUser: jest.fn(),
    resetPasswordWithEmailCode: jest.fn(),
    saveAutoLoginCredentials: jest.fn(),
    sendEmailVerificationCode: jest.fn(),
    setGuestSession: jest.fn(),
    setPreferenceValue: jest.fn(),
    setUserSession: jest.fn(),
    updateUserDisplayName: jest.fn(),
    updateUserPassword: jest.fn(),
    upsertFavoriteForUser: jest.fn(),
    verifyPasswordHash: jest.fn(),
}));

const mockGetActiveSession = database.getActiveSession as jest.MockedFunction<typeof database.getActiveSession>;
const mockGetFavoritesByUser = database.getFavoritesByUser as jest.MockedFunction<typeof database.getFavoritesByUser>;
const mockGetPreferenceValue = database.getPreferenceValue as jest.MockedFunction<typeof database.getPreferenceValue>;
const mockSetPreferenceValue = database.setPreferenceValue as jest.MockedFunction<typeof database.setPreferenceValue>;
const mockSetGuestSession = database.setGuestSession as jest.MockedFunction<typeof database.setGuestSession>;
const mockClearSession = database.clearSession as jest.MockedFunction<typeof database.clearSession>;
const mockFindUserByUsername = database.findUserByUsername as jest.MockedFunction<typeof database.findUserByUsername>;
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
        mockGetFavoritesByUser.mockResolvedValue([]);
        mockGetPreferenceValue.mockResolvedValue(null);
        mockSetPreferenceValue.mockResolvedValue(undefined);
        mockSetGuestSession.mockResolvedValue(undefined);
        mockClearSession.mockResolvedValue(undefined);
        mockFindUserByUsername.mockResolvedValue(null);
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
});
