import { type MutableRefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "react-native";

import { fetchDictionaryEntry } from "@/api/dictionary/freeDictionaryClient";
import { type AppError } from "@/errors/AppError";
import { setUserContext } from "@/logging/logger";
import {
    ACCOUNT_DELETION_ERROR_MESSAGE,
    ACCOUNT_REDIRECT_ERROR_MESSAGE,
    DATABASE_INIT_ERROR_MESSAGE,
    DEFAULT_GUEST_NAME,
    DISPLAY_NAME_AVAILABLE_MESSAGE,
    DISPLAY_NAME_DUPLICATE_ERROR_MESSAGE,
    DISPLAY_NAME_REQUIRED_ERROR_MESSAGE,
    FAVORITE_LIMIT_MESSAGE,
    GUEST_ACCESS_ERROR_MESSAGE,
    LOGIN_FAILED_ERROR_MESSAGE,
    LOGIN_GENERIC_ERROR_MESSAGE,
    LOGIN_INPUT_ERROR_MESSAGE,
    LOGOUT_ERROR_MESSAGE,
    MISSING_USER_ERROR_MESSAGE,
    PASSWORD_MISMATCH_ERROR_MESSAGE,
    PASSWORD_REQUIRED_ERROR_MESSAGE,
    PASSWORD_RESET_EMAIL_NOT_FOUND_MESSAGE,
    PASSWORD_RESET_EXPIRED_CODE_MESSAGE,
    PASSWORD_RESET_GENERIC_ERROR_MESSAGE,
    PASSWORD_RESET_INVALID_CODE_MESSAGE,
    PASSWORD_RESET_USED_CODE_MESSAGE,
    PASSWORD_UPDATE_ERROR_MESSAGE,
    PROFILE_UPDATE_ERROR_MESSAGE,
    REMOVE_FAVORITE_ERROR_MESSAGE,
    SIGNUP_DUPLICATE_ERROR_MESSAGE,
    SIGNUP_GENERIC_ERROR_MESSAGE,
    TOGGLE_FAVORITE_ERROR_MESSAGE,
    UPDATE_STATUS_ERROR_MESSAGE,
} from "@/screens/App/AppScreen.constants";
import type { LoginScreenProps } from "@/screens/Auth/LoginScreen.types";
import { exportBackupToFile, importBackupFromDocument } from "@/services/backup/manualBackup";
import {
    clearAutoLoginCredentials,
    clearSearchHistoryEntries,
    clearSession,
    createUser,
    deleteUserAccount,
    findUserByUsername,
    getActiveSession,
    getFavoritesByUser,
    getPreferenceValue,
    initializeDatabase,
    isDisplayNameTaken,
    removeFavoriteForUser,
    resetPasswordWithEmailCode,
    saveAutoLoginCredentials,
    sendEmailVerificationCode,
    setGuestSession,
    setPreferenceValue,
    setUserSession,
    updateUserDisplayName,
    updateUserPassword,
    upsertFavoriteForUser,
    type UserRecord,
    verifyPasswordHash,
} from "@/services/database";
import type { WordResult } from "@/services/dictionary/types";
import { clearPendingFlags } from "@/services/dictionary/utils/mergeExampleUpdates";
import { mergeFavoriteEntries, parseGuestFavoriteEntries } from "@/services/favorites/guestFavorites";
import { createFavoriteEntry, type FavoriteWordEntry, type MemorizationStatus } from "@/services/favorites/types";
import { GUEST_FAVORITES_PREFERENCE_KEY, GUEST_USED_PREFERENCE_KEY } from "@/theme/constants";
import {
    getEmailValidationError,
    getGooglePasswordValidationError,
    getNameValidationError,
    getPhoneNumberValidationError,
    normalizePhoneNumber,
} from "@/utils/authValidation";

export type SearchFlowBridge = {
    resetSearchState: (options?: { resetHasSearched?: boolean }) => void;
    reloadRecentSearches: () => Promise<void>;
    setErrorMessage: (message: string, kind?: AppError["kind"], extras?: Partial<AppError>) => void;
    clearError: () => void;
};

type UseSessionFlowArgs = {
    searchFlowBridgeRef: MutableRefObject<SearchFlowBridge | null>;
    setOnboardingVisible: (visible: boolean) => void;
    syncOnboardingVisibilityAfterAuthentication: () => Promise<void>;
};

type UseSessionFlowResult = {
    initializing: boolean;
    isAuthenticated: boolean;
    isGuest: boolean;
    authLoading: boolean;
    favorites: FavoriteWordEntry[];
    userName: string;
    canLogout: boolean;
    profileDisplayName: string | null;
    profileUsername: string | null;
    authError: string | null;
    signUpError: string | null;
    loginBindings: LoginScreenProps;
    onRequestLogin: () => void;
    onRequestSignUp: () => void;
    onLogout: () => void;
    onUpdateProfile: (displayName: string) => Promise<void>;
    onCheckDisplayName: (displayName: string) => Promise<string>;
    onUpdatePassword: (password: string) => Promise<void>;
    onDeleteAccount: () => Promise<void>;
    onExportBackup: (passphrase: string) => Promise<void>;
    onImportBackup: (passphrase: string) => Promise<void>;
    onToggleFavorite: (word: WordResult) => void;
    onUpdateFavoriteStatus: (word: string, status: MemorizationStatus) => void;
    onRemoveFavorite: (word: string) => void;
};

export function useSessionFlow({
    searchFlowBridgeRef,
    setOnboardingVisible,
    syncOnboardingVisibilityAfterAuthentication,
}: UseSessionFlowArgs): UseSessionFlowResult {
    const [favorites, setFavorites] = useState<FavoriteWordEntry[]>([]);
    const [user, setUser] = useState<UserRecord | null>(null);
    const [initializing, setInitializing] = useState(true);
    const [isGuest, setIsGuest] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);
    const [signUpError, setSignUpError] = useState<string | null>(null);
    const [authLoading, setAuthLoading] = useState(false);
    const loadUserStateRef = useRef<(userRecord: UserRecord) => Promise<void>>(async () => {});

    const reportSearchError = useCallback(
        (message: string, kind?: AppError["kind"], extras?: Partial<AppError>) => {
            searchFlowBridgeRef.current?.setErrorMessage(message, kind, extras);
        },
        [searchFlowBridgeRef],
    );

    const clearSearchError = useCallback(() => {
        searchFlowBridgeRef.current?.clearError();
    }, [searchFlowBridgeRef]);

    const resetSearchState = useCallback(
        (options?: { resetHasSearched?: boolean }) => {
            searchFlowBridgeRef.current?.resetSearchState(options);
        },
        [searchFlowBridgeRef],
    );

    const reloadRecentSearches = useCallback(async () => {
        await searchFlowBridgeRef.current?.reloadRecentSearches();
    }, [searchFlowBridgeRef]);

    const resolveAuthMessage = useCallback((error: unknown, fallbackMessage: string): string => {
        return error instanceof Error ? error.message : fallbackMessage;
    }, []);

    const ensurePhoneticForWord = useCallback(async (word: WordResult) => {
        if (word.phonetic?.trim()) {
            return word;
        }

        try {
            const fallback = await fetchDictionaryEntry(word.word);
            if (fallback.phonetic) {
                return {
                    ...word,
                    phonetic: fallback.phonetic,
                };
            }
        } catch (error) {
            console.warn("발음 기호를 가져오는 중 문제가 발생했어요.", error);
        }

        return word;
    }, []);

    const hydrateFavorites = useCallback(
        async (entries: FavoriteWordEntry[], userId?: number | null) => {
            if (entries.length === 0) {
                return entries;
            }

            let hasChanges = false;
            const nextEntries: FavoriteWordEntry[] = [];

            for (const entry of entries) {
                const updatedWord = await ensurePhoneticForWord(entry.word);
                if (updatedWord === entry.word) {
                    nextEntries.push(entry);
                    continue;
                }

                const hydratedEntry: FavoriteWordEntry = {
                    ...entry,
                    word: updatedWord,
                    updatedAt: new Date().toISOString(),
                };
                nextEntries.push(hydratedEntry);
                hasChanges = true;

                if (userId) {
                    try {
                        await upsertFavoriteForUser(userId, hydratedEntry);
                    } catch (error) {
                        console.warn("단어장 발음 기호 업데이트 중 문제가 발생했어요.", error);
                    }
                }
            }

            return hasChanges ? nextEntries : entries;
        },
        [ensurePhoneticForWord],
    );

    const setInitialAuthState = useCallback(() => {
        setIsGuest(false);
        setUser(null);
        setFavorites([]);
        resetSearchState();
        setAuthError(null);
        setSignUpError(null);
        setOnboardingVisible(false);
    }, [resetSearchState, setOnboardingVisible]);

    const resetAuthState = useCallback(() => {
        setInitialAuthState();
        setAuthLoading(false);
    }, [setInitialAuthState]);

    const parseAndMergeGuestFavorites = useCallback(
        async (userRecord: UserRecord) => {
            const storedFavorites = await getFavoritesByUser(userRecord.id);
            const hydratedFavorites = await hydrateFavorites(storedFavorites, userRecord.id);

            let nextFavorites = hydratedFavorites;
            let mergedCount = 0;
            try {
                const rawGuestFavorites = await getPreferenceValue(GUEST_FAVORITES_PREFERENCE_KEY);
                const guestFavorites = parseGuestFavoriteEntries(rawGuestFavorites);
                if (guestFavorites.length > 0) {
                    nextFavorites = mergeFavoriteEntries(hydratedFavorites, guestFavorites);
                    mergedCount = nextFavorites.length - hydratedFavorites.length;
                    await Promise.all(nextFavorites.map((entry) => upsertFavoriteForUser(userRecord.id, entry)));
                    await setPreferenceValue(GUEST_FAVORITES_PREFERENCE_KEY, "[]");
                }
            } catch (error) {
                console.warn("게스트 단어장 병합 중 문제가 발생했어요.", error);
            }

            setIsGuest(false);
            setUser(userRecord);
            setFavorites(nextFavorites);
            resetSearchState();
            setAuthError(null);
            if (mergedCount > 0) {
                Alert.alert(
                    "단어장 병합 완료",
                    `게스트 단어장 ${mergedCount}개를 계정에 반영했어요. 최신 항목 기준으로 병합되었습니다.`,
                );
            }
            await syncOnboardingVisibilityAfterAuthentication();
        },
        [hydrateFavorites, resetSearchState, setPreferenceValue, syncOnboardingVisibilityAfterAuthentication],
    );

    loadUserStateRef.current = parseAndMergeGuestFavorites;

    const applySignedOutState = useCallback(async () => {
        const session = await getActiveSession();
        if (session?.isGuest) {
            const rawGuestFavorites = await getPreferenceValue(GUEST_FAVORITES_PREFERENCE_KEY);
            const guestFavorites = await hydrateFavorites(parseGuestFavoriteEntries(rawGuestFavorites));
            setIsGuest(true);
            setUser(null);
            setFavorites(guestFavorites);
            resetSearchState();
            setAuthError(null);
            setSignUpError(null);
            return;
        }

        if (session && !session.isGuest) {
            await clearSession();
        }

        setIsGuest(false);
        setUser(null);
        setFavorites([]);
        resetSearchState();
        setAuthError(null);
        setSignUpError(null);
    }, [hydrateFavorites, resetSearchState]);

    useEffect(() => {
        let isMounted = true;

        async function bootstrap() {
            try {
                await initializeDatabase();
                const session = await getActiveSession();
                if (!isMounted) {
                    return;
                }
                if (session?.user && !session.isGuest) {
                    await loadUserStateRef.current(session.user);
                } else {
                    await applySignedOutState();
                }
            } catch (error) {
                if (!isMounted) {
                    return;
                }
                const message = error instanceof Error ? error.message : DATABASE_INIT_ERROR_MESSAGE;
                reportSearchError(message);
            } finally {
                if (isMounted) {
                    setInitializing(false);
                }
            }
        }

        void bootstrap();

        return () => {
            isMounted = false;
        };
    }, [applySignedOutState, reportSearchError]);

    useEffect(() => {
        if (!isGuest) {
            return;
        }

        void setPreferenceValue(GUEST_FAVORITES_PREFERENCE_KEY, JSON.stringify(favorites)).catch((error) => {
            console.warn("게스트 단어장을 저장하는 중 문제가 발생했어요.", error);
        });
    }, [favorites, isGuest]);

    const removeFavoritePersisted = useCallback(
        async (word: string) => {
            if (!user) {
                reportSearchError(MISSING_USER_ERROR_MESSAGE, "AuthError");
                return;
            }

            const previousFavorites = favorites;
            const nextFavorites = previousFavorites.filter((item) => item.word.word !== word);
            setFavorites(nextFavorites);

            try {
                await removeFavoriteForUser(user.id, word);
            } catch (error) {
                setFavorites(previousFavorites);
                const message = error instanceof Error ? error.message : REMOVE_FAVORITE_ERROR_MESSAGE;
                reportSearchError(message);
            }
        },
        [favorites, reportSearchError, user],
    );

    const toggleFavoriteAsync = useCallback(
        async (word: WordResult) => {
            const wordWithPhonetic = await ensurePhoneticForWord(word);
            const normalizedWord = clearPendingFlags(wordWithPhonetic);
            const previousFavorites = favorites;
            const existingEntry = previousFavorites.find((item) => item.word.word === word.word);

            if (isGuest) {
                if (!existingEntry && previousFavorites.length >= 10) {
                    reportSearchError(FAVORITE_LIMIT_MESSAGE, "ValidationError", { retryable: false });
                    return;
                }
                clearSearchError();
                if (existingEntry) {
                    setFavorites(previousFavorites.filter((item) => item.word.word !== word.word));
                } else {
                    setFavorites([createFavoriteEntry(normalizedWord), ...previousFavorites]);
                }
                return;
            }

            if (!user) {
                reportSearchError(MISSING_USER_ERROR_MESSAGE, "AuthError");
                return;
            }

            if (existingEntry) {
                void removeFavoritePersisted(word.word);
                return;
            }

            const newEntry = createFavoriteEntry(normalizedWord, "toMemorize");
            const nextFavorites = [newEntry, ...previousFavorites];
            setFavorites(nextFavorites);

            try {
                await upsertFavoriteForUser(user.id, newEntry);
            } catch (error) {
                setFavorites(previousFavorites);
                const message = error instanceof Error ? error.message : TOGGLE_FAVORITE_ERROR_MESSAGE;
                reportSearchError(message);
            }
        },
        [clearSearchError, ensurePhoneticForWord, favorites, isGuest, removeFavoritePersisted, reportSearchError, user],
    );

    const updateFavoriteStatusAsync = useCallback(
        async (word: string, nextStatus: MemorizationStatus) => {
            const previousFavorites = favorites;
            const target = previousFavorites.find((item) => item.word.word === word);
            if (!target) {
                return;
            }

            const updatedEntry: FavoriteWordEntry = {
                ...target,
                status: nextStatus,
                updatedAt: new Date().toISOString(),
            };
            const nextFavorites = previousFavorites.map((item) => (item.word.word === word ? updatedEntry : item));
            setFavorites(nextFavorites);

            if (isGuest) {
                return;
            }

            if (!user) {
                setFavorites(previousFavorites);
                reportSearchError(MISSING_USER_ERROR_MESSAGE, "AuthError");
                return;
            }

            try {
                await upsertFavoriteForUser(user.id, updatedEntry);
            } catch (error) {
                setFavorites(previousFavorites);
                const message = error instanceof Error ? error.message : UPDATE_STATUS_ERROR_MESSAGE;
                reportSearchError(message);
            }
        },
        [favorites, isGuest, reportSearchError, user],
    );

    const handleRemoveFavorite = useCallback(
        (word: string) => {
            if (isGuest) {
                setFavorites((previous) => previous.filter((item) => item.word.word !== word));
                return;
            }

            void removeFavoritePersisted(word);
        },
        [isGuest, removeFavoritePersisted],
    );

    const handleGuestAccessAsync = useCallback(async () => {
        setAuthLoading(true);
        setAuthError(null);
        setSignUpError(null);
        try {
            await setGuestSession();
            await setPreferenceValue(GUEST_USED_PREFERENCE_KEY, "true");
            setOnboardingVisible(true);
            setIsGuest(true);
            setUser(null);
            setFavorites([]);
            resetSearchState();
        } catch (error) {
            const message = error instanceof Error ? error.message : GUEST_ACCESS_ERROR_MESSAGE;
            setAuthError(message);
        } finally {
            setAuthLoading(false);
        }
    }, [resetSearchState, setOnboardingVisible]);

    const handleGuestAuthRedirectAsync = useCallback(async () => {
        setAuthError(null);
        setSignUpError(null);
        try {
            await clearSession();
        } catch (error) {
            const message = error instanceof Error ? error.message : ACCOUNT_REDIRECT_ERROR_MESSAGE;
            setAuthError(message);
        } finally {
            resetAuthState();
        }
    }, [resetAuthState]);

    const handleRequestLogin = useCallback(() => {
        void handleGuestAuthRedirectAsync();
    }, [handleGuestAuthRedirectAsync]);

    const handleRequestSignUp = useCallback(() => {
        void handleGuestAuthRedirectAsync();
    }, [handleGuestAuthRedirectAsync]);

    const handleLogin = useCallback(
        async ({ email, password }: { email: string; password: string }) => {
            setAuthLoading(true);
            setAuthError(null);
            setSignUpError(null);
            try {
                const emailError = getEmailValidationError(email);
                if (emailError) {
                    throw new Error(emailError);
                }
                const trimmedPassword = password.trim();
                if (!trimmedPassword) {
                    throw new Error(LOGIN_INPUT_ERROR_MESSAGE);
                }

                const normalizedEmail = email.trim().toLowerCase();
                const userRecord = await findUserByUsername(normalizedEmail);
                if (!userRecord?.passwordHash) {
                    throw new Error(LOGIN_FAILED_ERROR_MESSAGE);
                }
                const isValidPassword = await verifyPasswordHash(trimmedPassword, userRecord.passwordHash);
                if (!isValidPassword) {
                    throw new Error(LOGIN_FAILED_ERROR_MESSAGE);
                }
                await setUserSession(userRecord.id);
                await saveAutoLoginCredentials(normalizedEmail, userRecord.passwordHash);
                await parseAndMergeGuestFavorites(userRecord);
            } catch (error) {
                const message = resolveAuthMessage(error, LOGIN_GENERIC_ERROR_MESSAGE);
                setAuthError(message);
            } finally {
                setAuthLoading(false);
            }
        },
        [parseAndMergeGuestFavorites, resolveAuthMessage],
    );

    const handleSignUp = useCallback(
        async ({
            email,
            password,
            confirmPassword,
            fullName,
            phoneNumber,
        }: {
            email: string;
            password: string;
            confirmPassword: string;
            fullName: string;
            phoneNumber: string;
        }) => {
            setAuthLoading(true);
            setAuthError(null);
            setSignUpError(null);
            try {
                const emailError = getEmailValidationError(email);
                if (emailError) {
                    throw new Error(emailError);
                }
                const nameError = getNameValidationError(fullName);
                if (nameError) {
                    throw new Error(nameError);
                }
                const phoneError = getPhoneNumberValidationError(phoneNumber);
                if (phoneError) {
                    throw new Error(phoneError);
                }

                const trimmedPassword = password.trim();
                const trimmedConfirm = confirmPassword.trim();
                const passwordValidationError = getGooglePasswordValidationError(trimmedPassword);
                if (passwordValidationError) {
                    throw new Error(passwordValidationError);
                }
                if (trimmedPassword !== trimmedConfirm) {
                    throw new Error(PASSWORD_MISMATCH_ERROR_MESSAGE);
                }

                const normalizedEmail = email.trim().toLowerCase();
                const normalizedName = fullName.trim();
                const normalizedPhone = normalizePhoneNumber(phoneNumber);
                const existing = await findUserByUsername(normalizedEmail);
                if (existing?.passwordHash) {
                    throw new Error(SIGNUP_DUPLICATE_ERROR_MESSAGE);
                }

                let createdUser: UserRecord;
                let passwordHashForAutoLogin: string | null = null;
                if (existing) {
                    const { user: updated, passwordHash } = await updateUserPassword(existing.id, trimmedPassword);
                    passwordHashForAutoLogin = passwordHash;
                    createdUser =
                        normalizedName && normalizedName !== (updated.displayName ?? "")
                            ? await updateUserDisplayName(updated.id, normalizedName)
                            : updated;
                } else {
                    createdUser = await createUser(normalizedEmail, trimmedPassword, normalizedName, normalizedPhone);
                    const createdWithHash = await findUserByUsername(normalizedEmail);
                    passwordHashForAutoLogin = createdWithHash?.passwordHash ?? null;
                }

                await setUserSession(createdUser.id);
                if (passwordHashForAutoLogin) {
                    await saveAutoLoginCredentials(normalizedEmail, passwordHashForAutoLogin);
                }
                await parseAndMergeGuestFavorites(createdUser);
            } catch (error) {
                const message = resolveAuthMessage(error, SIGNUP_GENERIC_ERROR_MESSAGE);
                if (message === SIGNUP_DUPLICATE_ERROR_MESSAGE) {
                    setSignUpError(SIGNUP_DUPLICATE_ERROR_MESSAGE);
                } else {
                    setSignUpError(message);
                }
            } finally {
                setAuthLoading(false);
            }
        },
        [parseAndMergeGuestFavorites, resolveAuthMessage],
    );

    const handleRequestPasswordResetCode = useCallback(
        async (email: string) => {
            const emailError = getEmailValidationError(email);
            if (emailError) {
                throw new Error(emailError);
            }

            const normalizedEmail = email.trim().toLowerCase();
            const userRecord = await findUserByUsername(normalizedEmail);
            if (!userRecord?.passwordHash) {
                throw new Error(PASSWORD_RESET_EMAIL_NOT_FOUND_MESSAGE);
            }

            try {
                const verification = await sendEmailVerificationCode(normalizedEmail);
                return {
                    email: normalizedEmail,
                    expiresAt: verification.expiresAt,
                    debugCode: verification.code,
                };
            } catch (error) {
                const message = resolveAuthMessage(error, PASSWORD_RESET_GENERIC_ERROR_MESSAGE);
                throw new Error(message);
            }
        },
        [resolveAuthMessage],
    );

    const handleConfirmPasswordReset = useCallback(
        async ({
            email,
            code,
            newPassword,
            confirmPassword,
        }: {
            email: string;
            code: string;
            newPassword: string;
            confirmPassword: string;
        }) => {
            const emailError = getEmailValidationError(email);
            if (emailError) {
                throw new Error(emailError);
            }

            const trimmedCode = code.trim();
            if (!trimmedCode) {
                throw new Error(PASSWORD_RESET_INVALID_CODE_MESSAGE);
            }

            const trimmedPassword = newPassword.trim();
            const trimmedConfirm = confirmPassword.trim();
            const passwordValidationError = getGooglePasswordValidationError(trimmedPassword);
            if (passwordValidationError) {
                throw new Error(passwordValidationError);
            }
            if (trimmedPassword !== trimmedConfirm) {
                throw new Error(PASSWORD_MISMATCH_ERROR_MESSAGE);
            }

            try {
                const resetStatus = await resetPasswordWithEmailCode(email, trimmedCode, trimmedPassword);
                if (resetStatus === "email_not_found") {
                    throw new Error(PASSWORD_RESET_EMAIL_NOT_FOUND_MESSAGE);
                }
                if (resetStatus === "invalid_code") {
                    throw new Error(PASSWORD_RESET_INVALID_CODE_MESSAGE);
                }
                if (resetStatus === "expired") {
                    throw new Error(PASSWORD_RESET_EXPIRED_CODE_MESSAGE);
                }
                if (resetStatus === "already_used") {
                    throw new Error(PASSWORD_RESET_USED_CODE_MESSAGE);
                }
            } catch (error) {
                const message = resolveAuthMessage(error, PASSWORD_RESET_GENERIC_ERROR_MESSAGE);
                throw new Error(message);
            }

            await clearSession();
            await clearAutoLoginCredentials();
            resetAuthState();
        },
        [resetAuthState, resolveAuthMessage],
    );

    const handleLogoutAsync = useCallback(async () => {
        setAuthLoading(true);
        setAuthError(null);
        setSignUpError(null);
        try {
            await clearSession();
            await clearAutoLoginCredentials();
            resetAuthState();
        } catch (error) {
            const message = resolveAuthMessage(error, LOGOUT_ERROR_MESSAGE);
            setAuthError(message);
        } finally {
            setAuthLoading(false);
        }
    }, [resetAuthState, resolveAuthMessage]);

    const handleDeleteAccount = useCallback(async () => {
        if (!user) {
            throw new Error(MISSING_USER_ERROR_MESSAGE);
        }
        try {
            await deleteUserAccount(user.id, user.username);
            await clearSession();
            await clearAutoLoginCredentials();
            await clearSearchHistoryEntries();
            setInitialAuthState();
            await reloadRecentSearches();
        } catch (error) {
            const message = resolveAuthMessage(error, ACCOUNT_DELETION_ERROR_MESSAGE);
            throw new Error(message);
        }
    }, [reloadRecentSearches, resolveAuthMessage, setInitialAuthState, user]);

    const handleProfilePasswordUpdate = useCallback(
        async (password: string) => {
            if (!user) {
                throw new Error(MISSING_USER_ERROR_MESSAGE);
            }

            const trimmedPassword = password.trim();
            if (!trimmedPassword) {
                throw new Error(PASSWORD_REQUIRED_ERROR_MESSAGE);
            }

            const passwordValidationError = getGooglePasswordValidationError(trimmedPassword);
            if (passwordValidationError) {
                throw new Error(passwordValidationError);
            }

            try {
                const { passwordHash } = await updateUserPassword(user.id, trimmedPassword);
                await saveAutoLoginCredentials(user.username, passwordHash);
            } catch (error) {
                const message = resolveAuthMessage(error, PASSWORD_UPDATE_ERROR_MESSAGE);
                throw new Error(message);
            }
        },
        [resolveAuthMessage, user],
    );

    const handleProfileUpdate = useCallback(
        async (displayName: string) => {
            if (!user) {
                throw new Error(MISSING_USER_ERROR_MESSAGE);
            }

            const normalizedName = displayName.trim();
            try {
                if (normalizedName) {
                    const taken = await isDisplayNameTaken(normalizedName, user.id);
                    if (taken) {
                        throw new Error(DISPLAY_NAME_DUPLICATE_ERROR_MESSAGE);
                    }
                }
                const updated = await updateUserDisplayName(user.id, normalizedName || null);
                setUser(updated);
            } catch (error) {
                const message = error instanceof Error ? error.message : PROFILE_UPDATE_ERROR_MESSAGE;
                throw new Error(message);
            }
        },
        [user],
    );

    const handleCheckDisplayName = useCallback(
        async (displayName: string) => {
            const normalizedName = displayName.trim();
            if (!normalizedName) {
                throw new Error(DISPLAY_NAME_REQUIRED_ERROR_MESSAGE);
            }
            const taken = await isDisplayNameTaken(normalizedName, user?.id);
            if (taken) {
                throw new Error(DISPLAY_NAME_DUPLICATE_ERROR_MESSAGE);
            }
            return DISPLAY_NAME_AVAILABLE_MESSAGE;
        },
        [user],
    );

    const handleBackupExport = useCallback(async (passphrase: string) => {
        try {
            await exportBackupToFile(passphrase);
            Alert.alert("백업 완료", "암호화된 백업 파일을 저장하거나 공유했어요.");
        } catch (error) {
            const message = error instanceof Error ? error.message : "백업을 생성하지 못했어요.";
            Alert.alert("백업 실패", message);
        }
    }, []);

    const handleBackupImport = useCallback(
        async (passphrase: string) => {
            try {
                const restoreResult = await importBackupFromDocument(passphrase);
                if ("canceled" in restoreResult) {
                    return;
                }
                if (!restoreResult.ok) {
                    Alert.alert("복원 실패", restoreResult.message);
                    return;
                }
                if (user?.username) {
                    const refreshed = await findUserByUsername(user.username);
                    if (refreshed) {
                        await loadUserStateRef.current({
                            id: refreshed.id,
                            username: refreshed.username,
                            displayName: refreshed.displayName,
                            phoneNumber: refreshed.phoneNumber,
                        });
                    } else {
                        setInitialAuthState();
                    }
                }
                await reloadRecentSearches();
                Alert.alert(
                    "복원 완료",
                    `백업 데이터로 복원했어요.\n계정 ${restoreResult.restored.users}개, 단어 ${restoreResult.restored.favorites}개, 검색 ${restoreResult.restored.searchHistory}개`,
                );
            } catch (error) {
                const message = error instanceof Error ? error.message : "백업 데이터를 불러오지 못했어요.";
                Alert.alert("복원 실패", message);
            }
        },
        [findUserByUsername, reloadRecentSearches, setInitialAuthState, user?.username],
    );

    const handleGuestAccess = useCallback(() => {
        void handleGuestAccessAsync();
    }, [handleGuestAccessAsync]);

    const handleLogout = useCallback(() => {
        void handleLogoutAsync();
    }, [handleLogoutAsync]);

    const onToggleFavorite = useCallback(
        (word: WordResult) => {
            void toggleFavoriteAsync(word);
        },
        [toggleFavoriteAsync],
    );

    const onUpdateFavoriteStatus = useCallback(
        (word: string, status: MemorizationStatus) => {
            void updateFavoriteStatusAsync(word, status);
        },
        [updateFavoriteStatusAsync],
    );

    const onRemoveFavorite = useCallback(
        (word: string) => {
            void handleRemoveFavorite(word);
        },
        [handleRemoveFavorite],
    );

    const isAuthenticated = useMemo(() => isGuest || user !== null, [isGuest, user]);
    const canLogout = user !== null;
    const userName = user?.displayName ?? user?.username ?? DEFAULT_GUEST_NAME;
    const profileDisplayName = user?.displayName ?? null;
    const profileUsername = user?.username ?? null;

    const loginBindings = useMemo<LoginScreenProps>(
        () => ({
            onGuest: handleGuestAccess,
            onLogin: handleLogin,
            onRequestPasswordResetCode: handleRequestPasswordResetCode,
            onConfirmPasswordReset: handleConfirmPasswordReset,
            onSignUp: handleSignUp,
            loading: authLoading,
            errorMessage: authError,
            signUpErrorMessage: signUpError,
        }),
        [
            authError,
            authLoading,
            handleConfirmPasswordReset,
            handleGuestAccess,
            handleLogin,
            handleRequestPasswordResetCode,
            handleSignUp,
            signUpError,
        ],
    );

    useEffect(() => {
        setUserContext(user?.id ?? null);
    }, [user?.id]);

    return {
        initializing,
        isAuthenticated,
        isGuest,
        authLoading,
        favorites,
        userName,
        canLogout,
        profileDisplayName,
        profileUsername,
        authError,
        signUpError,
        loginBindings,
        onRequestLogin: handleRequestLogin,
        onRequestSignUp: handleRequestSignUp,
        onLogout: handleLogout,
        onUpdateProfile: handleProfileUpdate,
        onCheckDisplayName: handleCheckDisplayName,
        onUpdatePassword: handleProfilePasswordUpdate,
        onDeleteAccount: handleDeleteAccount,
        onExportBackup: handleBackupExport,
        onImportBackup: handleBackupImport,
        onToggleFavorite,
        onUpdateFavoriteStatus,
        onRemoveFavorite,
    };
}
