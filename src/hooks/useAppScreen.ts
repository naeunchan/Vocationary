import Constants from "expo-constants";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "react-native";

import { normalizeAIProxyError } from "@/api/dictionary/aiProxyError";
import { fetchDictionaryEntry } from "@/api/dictionary/freeDictionaryClient";
import { getPronunciationAudio } from "@/api/dictionary/getPronunciationAudio";
import { OPENAI_FEATURE_ENABLED } from "@/config/openAI";
import type { AppError } from "@/errors/AppError";
import { shouldRetry } from "@/errors/AppError";
import { useAppearanceFlow } from "@/hooks/app/useAppearanceFlow";
import { useSearchFlow } from "@/hooks/app/useSearchFlow";
import { captureAppError, setUserContext } from "@/logging/logger";
import type { RootTabNavigatorProps } from "@/navigation/RootTabNavigator.types";
import {
    ACCOUNT_DELETION_ERROR_MESSAGE,
    ACCOUNT_REDIRECT_ERROR_MESSAGE,
    AUDIO_PLAY_ERROR_MESSAGE,
    AUDIO_UNAVAILABLE_MESSAGE,
    DATABASE_INIT_ERROR_MESSAGE,
    DEFAULT_GUEST_NAME,
    DEFAULT_VERSION_LABEL,
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
import type { AppScreenHookResult } from "@/screens/App/AppScreen.types";
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
import { WordResult } from "@/services/dictionary/types";
import { clearPendingFlags } from "@/services/dictionary/utils/mergeExampleUpdates";
import { createFavoriteEntry, FavoriteWordEntry, MemorizationStatus } from "@/services/favorites/types";
import { GUEST_FAVORITES_PREFERENCE_KEY, GUEST_USED_PREFERENCE_KEY } from "@/theme/constants";
import { playRemoteAudio } from "@/utils/audio";
import {
    getEmailValidationError,
    getGooglePasswordValidationError,
    getNameValidationError,
    getPhoneNumberValidationError,
    normalizePhoneNumber,
} from "@/utils/authValidation";

export function useAppScreen(): AppScreenHookResult {
    const [favorites, setFavorites] = useState<FavoriteWordEntry[]>([]);
    const [user, setUser] = useState<UserRecord | null>(null);
    const [initializing, setInitializing] = useState(true);
    const [isGuest, setIsGuest] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);
    const [signUpError, setSignUpError] = useState<string | null>(null);
    const [authLoading, setAuthLoading] = useState(false);
    const [versionLabel] = useState(() => {
        const extra = Constants.expoConfig?.extra;
        return extra?.versionLabel ?? DEFAULT_VERSION_LABEL;
    });
    const {
        themeMode,
        fontScale,
        appearanceReady,
        isOnboardingVisible,
        setOnboardingVisible,
        onThemeModeChange: handleThemeModeChange,
        onFontScaleChange: handleFontScaleChange,
        onShowOnboarding: handleShowOnboarding,
        onCompleteOnboarding: handleCompleteOnboarding,
        syncOnboardingVisibilityAfterAuthentication,
    } = useAppearanceFlow();
    const hasShownPronunciationInfoRef = useRef(false);
    const loadUserStateRef = useRef<(userRecord: UserRecord) => Promise<void>>(async () => {});
    const isPronunciationAvailable = OPENAI_FEATURE_ENABLED;
    const {
        searchTerm,
        hasSearched,
        loading,
        error,
        aiAssistError,
        result,
        examplesVisible,
        recentSearches,
        autocompleteSuggestions,
        autocompleteLoading,
        setErrorMessage,
        clearError,
        resetSearchState,
        reloadRecentSearches,
        onChangeSearchTerm: handleSearchTermChange,
        onSubmitSearch: handleSearch,
        onSelectRecentSearch: handleSelectRecentSearch,
        onSelectAutocomplete: handleSelectAutocomplete,
        onToggleExamples: handleToggleExamples,
        onClearRecentSearches: handleClearRecentSearches,
        onRetrySearch: retrySearch,
        onRetryAiAssist: retryExamples,
        onRegenerateExamples: regenerateExamples,
    } = useSearchFlow({
        favorites,
        pronunciationAvailable: isPronunciationAvailable,
    });

    const resolveAuthMessage = useCallback((error: unknown, fallbackMessage: string): string => {
        return error instanceof Error ? error.message : fallbackMessage;
    }, []);

    const parseGuestFavorites = useCallback((raw: string | null): FavoriteWordEntry[] => {
        if (!raw) {
            return [];
        }
        try {
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) {
                return [];
            }
            return parsed.filter((entry) => entry && typeof entry.word?.word === "string");
        } catch {
            return [];
        }
    }, []);

    const mergeFavorites = useCallback((base: FavoriteWordEntry[], incoming: FavoriteWordEntry[]) => {
        const byWord = new Map<string, FavoriteWordEntry>();
        const pickLatest = (current: FavoriteWordEntry, next: FavoriteWordEntry) => {
            const currentTime = new Date(current.updatedAt).getTime();
            const nextTime = new Date(next.updatedAt).getTime();
            return nextTime >= currentTime ? next : current;
        };

        base.forEach((entry) => {
            byWord.set(entry.word.word, entry);
        });
        incoming.forEach((entry) => {
            const existing = byWord.get(entry.word.word);
            if (!existing) {
                byWord.set(entry.word.word, entry);
            } else {
                byWord.set(entry.word.word, pickLatest(existing, entry));
            }
        });

        return Array.from(byWord.values()).sort((a, b) => {
            const aTime = new Date(a.updatedAt).getTime();
            const bTime = new Date(b.updatedAt).getTime();
            return bTime - aTime;
        });
    }, []);

    const persistGuestFavorites = useCallback(
        (entries: FavoriteWordEntry[]) => {
            void setPreferenceValue(GUEST_FAVORITES_PREFERENCE_KEY, JSON.stringify(entries)).catch((error) => {
                console.warn("게스트 단어장을 저장하는 중 문제가 발생했어요.", error);
            });
        },
        [setPreferenceValue],
    );

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
        [ensurePhoneticForWord, upsertFavoriteForUser],
    );

    useEffect(() => {
        let isMounted = true;

        const applySignedOutState = async () => {
            const session = await getActiveSession();
            if (session?.isGuest) {
                const rawGuestFavorites = await getPreferenceValue(GUEST_FAVORITES_PREFERENCE_KEY);
                const guestFavorites = await hydrateFavorites(parseGuestFavorites(rawGuestFavorites));
                if (!isMounted) {
                    return;
                }
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

            if (!isMounted) {
                return;
            }

            setIsGuest(false);
            setUser(null);
            setFavorites([]);
            resetSearchState();
            setAuthError(null);
            setSignUpError(null);
        };

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
            } catch (err) {
                if (!isMounted) {
                    return;
                }
                const message = err instanceof Error ? err.message : DATABASE_INIT_ERROR_MESSAGE;
                setErrorMessage(message);
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
    }, [
        clearSession,
        getActiveSession,
        getPreferenceValue,
        hydrateFavorites,
        initializeDatabase,
        parseGuestFavorites,
        resetSearchState,
        setErrorMessage,
    ]);

    useEffect(() => {
        if (!isGuest) {
            return;
        }
        persistGuestFavorites(favorites);
    }, [favorites, isGuest, persistGuestFavorites]);

    const reportAiAssistError = useCallback((error: unknown, scope: "examples" | "tts"): AppError => {
        const appError = normalizeAIProxyError(error, scope);
        if (appError.kind !== "ValidationError") {
            captureAppError(appError, { scope: `ai.${scope}` });
        }
        return appError;
    }, []);

    const isCurrentFavorite = useMemo(() => {
        if (!result) {
            return false;
        }
        return favorites.some((item) => item.word.word === result.word);
    }, [favorites, result]);

    const removeFavoritePersisted = useCallback(
        async (word: string) => {
            if (!user) {
                setErrorMessage(MISSING_USER_ERROR_MESSAGE, "AuthError");
                return;
            }

            const previousFavorites = favorites;
            const nextFavorites = previousFavorites.filter((item) => item.word.word !== word);
            setFavorites(nextFavorites);

            try {
                await removeFavoriteForUser(user.id, word);
            } catch (err) {
                setFavorites(previousFavorites);
                const message = err instanceof Error ? err.message : REMOVE_FAVORITE_ERROR_MESSAGE;
                setErrorMessage(message);
            }
        },
        [favorites, user],
    );

    const toggleFavoriteAsync = useCallback(
        async (word: WordResult) => {
            const wordWithPhonetic = await ensurePhoneticForWord(word);
            const normalizedWord = clearPendingFlags(wordWithPhonetic);
            const previousFavorites = favorites;
            const existingEntry = previousFavorites.find((item) => item.word.word === word.word);

            if (isGuest) {
                if (!existingEntry && previousFavorites.length >= 10) {
                    setErrorMessage(FAVORITE_LIMIT_MESSAGE, "ValidationError", { retryable: false });
                    return;
                }
                clearError();
                if (existingEntry) {
                    setFavorites(previousFavorites.filter((item) => item.word.word !== word.word));
                } else {
                    setFavorites([createFavoriteEntry(normalizedWord), ...previousFavorites]);
                }
                return;
            }

            if (!user) {
                setErrorMessage(MISSING_USER_ERROR_MESSAGE, "AuthError");
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
            } catch (err) {
                setFavorites(previousFavorites);
                const message = err instanceof Error ? err.message : TOGGLE_FAVORITE_ERROR_MESSAGE;
                setErrorMessage(message);
            }
        },
        [clearError, ensurePhoneticForWord, favorites, isGuest, removeFavoritePersisted, user],
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
                setErrorMessage(MISSING_USER_ERROR_MESSAGE, "AuthError");
                return;
            }

            try {
                await upsertFavoriteForUser(user.id, updatedEntry);
            } catch (err) {
                setFavorites(previousFavorites);
                const message = err instanceof Error ? err.message : UPDATE_STATUS_ERROR_MESSAGE;
                setErrorMessage(message);
            }
        },
        [favorites, isGuest, user],
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

    const showAudioErrorAlert = useCallback((appError: AppError, retryAction: () => void) => {
        if (shouldRetry(appError)) {
            Alert.alert(AUDIO_PLAY_ERROR_MESSAGE, appError.message, [
                { text: "취소", style: "cancel" },
                { text: "다시 시도", onPress: retryAction },
            ]);
            return;
        }
        Alert.alert(AUDIO_PLAY_ERROR_MESSAGE, appError.message);
    }, []);

    const playPronunciationAsync = useCallback(async () => {
        const currentWord = result?.word?.trim();
        if (!currentWord) {
            Alert.alert(AUDIO_PLAY_ERROR_MESSAGE, AUDIO_UNAVAILABLE_MESSAGE);
            return;
        }

        if (!isPronunciationAvailable) {
            if (!hasShownPronunciationInfoRef.current) {
                Alert.alert("발음 재생", "발음 기능은 현재 사용할 수 없습니다. 백엔드 연동 후 활성화됩니다.");
                hasShownPronunciationInfoRef.current = true;
            }
            return;
        }

        try {
            const uri = await getPronunciationAudio(currentWord);
            await playRemoteAudio(uri);
        } catch (err) {
            const appError = reportAiAssistError(err, "tts");
            showAudioErrorAlert(appError, () => {
                void playPronunciationAsync();
            });
        }
    }, [isPronunciationAvailable, reportAiAssistError, result?.word, showAudioErrorAlert]);

    const handlePlayWordAudioAsync = useCallback(
        async (word: WordResult) => {
            const target = word.word?.trim();
            if (!target) {
                Alert.alert(AUDIO_PLAY_ERROR_MESSAGE, AUDIO_UNAVAILABLE_MESSAGE);
                return;
            }

            if (!isPronunciationAvailable) {
                if (!hasShownPronunciationInfoRef.current) {
                    Alert.alert("발음 재생", "발음 기능은 현재 사용할 수 없습니다. 백엔드 연동 후 활성화됩니다.");
                    hasShownPronunciationInfoRef.current = true;
                }
                return;
            }

            try {
                const uri = await getPronunciationAudio(target);
                await playRemoteAudio(uri);
            } catch (err) {
                const appError = reportAiAssistError(err, "tts");
                showAudioErrorAlert(appError, () => {
                    void handlePlayWordAudioAsync(word);
                });
            }
        },
        [isPronunciationAvailable, reportAiAssistError, showAudioErrorAlert],
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

    const handleGuestAccessAsync = useCallback(async () => {
        setAuthLoading(true);
        setAuthError(null);
        setSignUpError(null);
        try {
            await setGuestSession();
            await setPreferenceValue(GUEST_USED_PREFERENCE_KEY, "true");
            // Always show onboarding right after guest login.
            setOnboardingVisible(true);
            setIsGuest(true);
            setUser(null);
            setFavorites([]);
            resetSearchState();
        } catch (err) {
            const message = err instanceof Error ? err.message : GUEST_ACCESS_ERROR_MESSAGE;
            setAuthError(message);
        } finally {
            setAuthLoading(false);
        }
    }, [resetSearchState, setOnboardingVisible]);

    const resetAuthState = useCallback(() => {
        setInitialAuthState();
        setAuthLoading(false);
    }, [setInitialAuthState]);

    const handleGuestAuthRedirectAsync = useCallback(async () => {
        setAuthError(null);
        setSignUpError(null);
        try {
            await clearSession();
        } catch (err) {
            const message = err instanceof Error ? err.message : ACCOUNT_REDIRECT_ERROR_MESSAGE;
            setAuthError(message);
        } finally {
            resetAuthState();
        }
    }, [resetAuthState]);

    const handleGuestLoginRequest = useCallback(() => {
        void handleGuestAuthRedirectAsync();
    }, [handleGuestAuthRedirectAsync]);

    const handleGuestSignUpRequest = useCallback(() => {
        void handleGuestAuthRedirectAsync();
    }, [handleGuestAuthRedirectAsync]);

    const loadUserState = useCallback(
        async (userRecord: UserRecord) => {
            const storedFavorites = await getFavoritesByUser(userRecord.id);
            const hydratedFavorites = await hydrateFavorites(storedFavorites, userRecord.id);

            let nextFavorites = hydratedFavorites;
            let mergedCount = 0;
            try {
                const rawGuestFavorites = await getPreferenceValue(GUEST_FAVORITES_PREFERENCE_KEY);
                const guestFavorites = parseGuestFavorites(rawGuestFavorites);
                if (guestFavorites.length > 0) {
                    nextFavorites = mergeFavorites(hydratedFavorites, guestFavorites);
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
        [
            hydrateFavorites,
            mergeFavorites,
            parseGuestFavorites,
            setPreferenceValue,
            syncOnboardingVisibilityAfterAuthentication,
            upsertFavoriteForUser,
            resetSearchState,
        ],
    );
    loadUserStateRef.current = loadUserState;

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
                await loadUserState(userRecord);
            } catch (err) {
                const message = resolveAuthMessage(err, LOGIN_GENERIC_ERROR_MESSAGE);
                setAuthError(message);
            } finally {
                setAuthLoading(false);
            }
        },
        [
            findUserByUsername,
            loadUserState,
            resolveAuthMessage,
            saveAutoLoginCredentials,
            setUserSession,
            verifyPasswordHash,
        ],
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
                await loadUserState(createdUser);
            } catch (err) {
                const message = resolveAuthMessage(err, SIGNUP_GENERIC_ERROR_MESSAGE);
                if (message === SIGNUP_DUPLICATE_ERROR_MESSAGE) {
                    setSignUpError(SIGNUP_DUPLICATE_ERROR_MESSAGE);
                } else {
                    setSignUpError(message);
                }
            } finally {
                setAuthLoading(false);
            }
        },
        [
            createUser,
            findUserByUsername,
            loadUserState,
            resolveAuthMessage,
            saveAutoLoginCredentials,
            setUserSession,
            updateUserDisplayName,
            updateUserPassword,
        ],
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
        [findUserByUsername, resolveAuthMessage, sendEmailVerificationCode],
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
        [clearAutoLoginCredentials, clearSession, resetPasswordWithEmailCode, resetAuthState, resolveAuthMessage],
    );

    const handleLogoutAsync = useCallback(async () => {
        setAuthLoading(true);
        setAuthError(null);
        setSignUpError(null);
        try {
            await clearSession();
            await clearAutoLoginCredentials();
            resetAuthState();
        } catch (err) {
            const message = resolveAuthMessage(err, LOGOUT_ERROR_MESSAGE);
            setAuthError(message);
        } finally {
            setAuthLoading(false);
        }
    }, [clearAutoLoginCredentials, clearSession, resetAuthState, resolveAuthMessage]);

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
    }, [
        clearAutoLoginCredentials,
        clearSearchHistoryEntries,
        clearSession,
        deleteUserAccount,
        reloadRecentSearches,
        resolveAuthMessage,
        setInitialAuthState,
        user,
    ]);

    const toggleFavorite = useCallback(
        (word: WordResult) => {
            void toggleFavoriteAsync(word);
        },
        [toggleFavoriteAsync],
    );

    const updateFavoriteStatus = useCallback(
        (word: string, nextStatus: MemorizationStatus) => {
            void updateFavoriteStatusAsync(word, nextStatus);
        },
        [updateFavoriteStatusAsync],
    );

    const playPronunciation = useCallback(() => {
        void playPronunciationAsync();
    }, [playPronunciationAsync]);

    const handlePlayWordAudio = useCallback(
        (word: WordResult) => {
            void handlePlayWordAudioAsync(word);
        },
        [handlePlayWordAudioAsync],
    );

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
            } catch (err) {
                const message = resolveAuthMessage(err, PASSWORD_UPDATE_ERROR_MESSAGE);
                throw new Error(message);
            }
        },
        [resolveAuthMessage, saveAutoLoginCredentials, updateUserPassword, user],
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
            } catch (err) {
                const message = err instanceof Error ? err.message : PROFILE_UPDATE_ERROR_MESSAGE;
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

    const handleGuestAccess = useCallback(() => {
        void handleGuestAccessAsync();
    }, [handleGuestAccessAsync]);

    const handleLogout = useCallback(() => {
        void handleLogoutAsync();
    }, [handleLogoutAsync]);

    const isAuthenticated = useMemo(() => isGuest || user !== null, [isGuest, user]);
    const canLogout = user !== null;
    const userName = user?.displayName ?? user?.username ?? DEFAULT_GUEST_NAME;

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
                        await loadUserState({
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
        [findUserByUsername, loadUserState, reloadRecentSearches, setInitialAuthState, user?.username],
    );

    const navigatorProps = useMemo<RootTabNavigatorProps>(
        () => ({
            favorites,
            onToggleFavorite: toggleFavorite,
            onUpdateFavoriteStatus: updateFavoriteStatus,
            onRemoveFavorite: handleRemoveFavorite,
            searchTerm,
            hasSearched,
            onChangeSearchTerm: handleSearchTermChange,
            onSubmitSearch: handleSearch,
            loading,
            error,
            aiAssistError,
            result,
            examplesVisible,
            onToggleExamples: handleToggleExamples,
            isCurrentFavorite,
            onPlayPronunciation: playPronunciation,
            pronunciationAvailable: isPronunciationAvailable,
            autocompleteSuggestions,
            autocompleteLoading,
            onSelectAutocomplete: handleSelectAutocomplete,
            themeMode,
            onThemeModeChange: handleThemeModeChange,
            fontScale,
            onFontScaleChange: handleFontScaleChange,
            recentSearches,
            onSelectRecentSearch: handleSelectRecentSearch,
            onClearRecentSearches: handleClearRecentSearches,
            onRetrySearch: retrySearch,
            onRetryAiAssist: retryExamples,
            onRegenerateExamples: regenerateExamples,
            userName,
            onLogout: handleLogout,
            canLogout,
            isGuest,
            onRequestLogin: handleGuestLoginRequest,
            onRequestSignUp: handleGuestSignUpRequest,
            onPlayWordAudio: handlePlayWordAudio,
            appVersion: versionLabel,
            profileDisplayName: user?.displayName ?? null,
            profileUsername: user?.username ?? null,
            onUpdateProfile: handleProfileUpdate,
            onCheckDisplayName: handleCheckDisplayName,
            onUpdatePassword: handleProfilePasswordUpdate,
            onDeleteAccount: handleDeleteAccount,
            onExportBackup: handleBackupExport,
            onImportBackup: handleBackupImport,
            onShowOnboarding: handleShowOnboarding,
        }),
        [
            canLogout,
            aiAssistError,
            autocompleteLoading,
            autocompleteSuggestions,
            error,
            examplesVisible,
            favorites,
            handleGuestLoginRequest,
            handleGuestSignUpRequest,
            handleSelectAutocomplete,
            handleSelectRecentSearch,
            handleToggleExamples,
            handleProfilePasswordUpdate,
            handleProfileUpdate,
            handleCheckDisplayName,
            handleShowOnboarding,
            handleDeleteAccount,
            handlePlayWordAudio,
            handleLogout,
            handleThemeModeChange,
            handleFontScaleChange,
            handleRemoveFavorite,
            handleSearchTermChange,
            hasSearched,
            retryExamples,
            regenerateExamples,
            handleBackupExport,
            handleBackupImport,
            isCurrentFavorite,
            isGuest,
            loading,
            themeMode,
            fontScale,
            recentSearches,
            playPronunciation,
            result,
            retrySearch,
            searchTerm,
            toggleFavorite,
            updateFavoriteStatus,
            user,
            userName,
            versionLabel,
            handleClearRecentSearches,
            isPronunciationAvailable,
        ],
    );

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
        versionLabel,
        initializing,
        appearanceReady,
        isOnboardingVisible,
        isAuthenticated,
        loginBindings,
        navigatorProps,
        onShowOnboarding: handleShowOnboarding,
        onCompleteOnboarding: handleCompleteOnboarding,
        themeMode,
        fontScale,
        onThemeModeChange: handleThemeModeChange,
        onFontScaleChange: handleFontScaleChange,
    };
}
