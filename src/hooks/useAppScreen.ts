import Constants from "expo-constants";
import * as LocalAuthentication from "expo-local-authentication";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "react-native";

import { fetchDictionaryEntry } from "@/api/dictionary/freeDictionaryClient";
import { getPronunciationAudio } from "@/api/dictionary/getPronunciationAudio";
import { getWordData } from "@/api/dictionary/getWordData";
import { OPENAI_FEATURE_ENABLED } from "@/config/openAI";
import type { AppError } from "@/errors/AppError";
import { createAppError, normalizeError } from "@/errors/AppError";
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
    EMPTY_SEARCH_ERROR_MESSAGE,
    FAVORITE_LIMIT_MESSAGE,
    GENERIC_ERROR_MESSAGE,
    GUEST_ACCESS_ERROR_MESSAGE,
    HELP_MODAL_ERROR_MESSAGE,
    HELP_MODAL_SAVE_ERROR_MESSAGE,
    LOGOUT_ERROR_MESSAGE,
    MISSING_USER_ERROR_MESSAGE,
    PASSWORD_REQUIRED_ERROR_MESSAGE,
    PASSWORD_UPDATE_ERROR_MESSAGE,
    PROFILE_UPDATE_ERROR_MESSAGE,
    REMOVE_FAVORITE_ERROR_MESSAGE,
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
    deleteUserAccount,
    findUserByUsername,
    getActiveSession,
    getFavoritesByUser,
    getPreferenceValue,
    getSearchHistoryEntries,
    hasSeenAppHelp,
    initializeDatabase,
    isDisplayNameTaken,
    markAppHelpSeen,
    removeFavoriteForUser,
    saveSearchHistoryEntries,
    setGuestSession,
    setPreferenceValue,
    setUserSession,
    updateUserDisplayName,
    updateUserPassword,
    upsertFavoriteForUser,
    type UserRecord,
} from "@/services/database";
import { DictionaryMode, WordResult } from "@/services/dictionary/types";
import { applyExampleUpdates, clearPendingFlags } from "@/services/dictionary/utils/mergeExampleUpdates";
import { createFavoriteEntry, FavoriteWordEntry, MemorizationStatus } from "@/services/favorites/types";
import { SEARCH_HISTORY_LIMIT, SearchHistoryEntry } from "@/services/searchHistory/types";
import {
    BIOMETRIC_LOGIN_PREFERENCE_KEY,
    DEFAULT_FONT_SCALE,
    FONT_SCALE_PREFERENCE_KEY,
    ONBOARDING_PREFERENCE_KEY,
    THEME_MODE_PREFERENCE_KEY,
} from "@/theme/constants";
import type { ThemeMode } from "@/theme/types";
import { playRemoteAudio } from "@/utils/audio";
import { getGooglePasswordValidationError } from "@/utils/authValidation";

export function useAppScreen(): AppScreenHookResult {
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<AppError | null>(null);
    const [result, setResult] = useState<WordResult | null>(null);
    const [examplesVisible, setExamplesVisible] = useState(false);
    const [favorites, setFavorites] = useState<FavoriteWordEntry[]>([]);
    const [mode, setMode] = useState<DictionaryMode>("en-en");
    const modeRef = useRef<DictionaryMode>("en-en");
    const [recentSearches, setRecentSearches] = useState<SearchHistoryEntry[]>([]);
    const [themeMode, setThemeMode] = useState<ThemeMode>("light");
    const [fontScale, setFontScale] = useState(DEFAULT_FONT_SCALE);
    const [appearanceReady, setAppearanceReady] = useState(false);
    const [user, setUser] = useState<UserRecord | null>(null);
    const [initializing, setInitializing] = useState(true);
    const [isGuest, setIsGuest] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);
    const [authLoading, setAuthLoading] = useState(false);
    const [isHelpVisible, setIsHelpVisible] = useState(false);
    const [isOnboardingVisible, setIsOnboardingVisible] = useState(false);
    const [versionLabel] = useState(() => {
        const extra = Constants.expoConfig?.extra;
        return extra?.versionLabel ?? DEFAULT_VERSION_LABEL;
    });
    const activeLookupRef = useRef(0);
    const hasShownPronunciationInfoRef = useRef(false);
    const isPronunciationAvailable = OPENAI_FEATURE_ENABLED;

    const setErrorMessage = useCallback(
        (message: string, kind: AppError["kind"] = "UnknownError", extras?: Partial<AppError>) => {
            setError(createAppError(kind, message, extras));
        },
        [],
    );

    const persistSearchHistory = useCallback(
        (entries: SearchHistoryEntry[]) => {
            void saveSearchHistoryEntries(entries).catch((error) => {
                console.warn("검색 이력을 저장하는 중 문제가 발생했어요.", error);
            });
        },
        [saveSearchHistoryEntries],
    );

    const ensurePhoneticForWord = useCallback(async (word: WordResult) => {
        if (word.phonetic?.trim()) {
            return word;
        }

        try {
            const fallback = await fetchDictionaryEntry(word.word, "en-en");
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
                        console.warn("즐겨찾기 발음 기호 업데이트 중 문제가 발생했어요.", error);
                    }
                }
            }

            return hasChanges ? nextEntries : entries;
        },
        [ensurePhoneticForWord, upsertFavoriteForUser],
    );

    useEffect(() => {
        let isMounted = true;

        async function ensureBiometricAuth(): Promise<boolean> {
            try {
                const enabled = await getPreferenceValue(BIOMETRIC_LOGIN_PREFERENCE_KEY);
                if (enabled !== "true") {
                    return true;
                }
                const hasHardware = await LocalAuthentication.hasHardwareAsync();
                const isEnrolled = await LocalAuthentication.isEnrolledAsync();
                if (!hasHardware || !isEnrolled) {
                    return true;
                }
                const result = await LocalAuthentication.authenticateAsync({
                    promptMessage: "생체인증으로 로그인",
                    cancelLabel: "취소",
                    fallbackLabel: "암호 입력",
                });
                return result.success;
            } catch {
                return false;
            }
        }

        async function bootstrap() {
            let shouldShowHelp = false;
            try {
                await initializeDatabase();
                try {
                    const alreadySeenHelp = await hasSeenAppHelp();
                    shouldShowHelp = !alreadySeenHelp;
                } catch (prefError) {
                    console.warn(HELP_MODAL_ERROR_MESSAGE, prefError);
                    shouldShowHelp = true;
                }

                const session = await getActiveSession();
                if (!isMounted) {
                    return;
                }

                if (!session) {
                    await clearAutoLoginCredentials();
                    setIsGuest(false);
                    setUser(null);
                    setFavorites([]);
                    return;
                }

                if (session.isGuest) {
                    await clearSession();
                    if (!isMounted) {
                        return;
                    }
                    setIsGuest(false);
                    setUser(null);
                    setFavorites([]);
                    return;
                }

                if (!session.user) {
                    setIsGuest(false);
                    setUser(null);
                    setFavorites([]);
                    return;
                }

                const biometricOk = await ensureBiometricAuth();
                if (!biometricOk) {
                    await clearSession();
                    await clearAutoLoginCredentials();
                    if (!isMounted) {
                        return;
                    }
                    setIsGuest(false);
                    setUser(null);
                    setFavorites([]);
                    return;
                }

                const storedFavorites = await getFavoritesByUser(session.user.id);
                const hydratedFavorites = await hydrateFavorites(storedFavorites, session.user.id);
                if (!isMounted) {
                    return;
                }

                setUser(session.user);
                setIsGuest(false);
                setFavorites(hydratedFavorites);
            } catch (err) {
                if (!isMounted) {
                    return;
                }
                const message = err instanceof Error ? err.message : DATABASE_INIT_ERROR_MESSAGE;
                setErrorMessage(message);
            } finally {
                if (isMounted) {
                    setIsHelpVisible(shouldShowHelp);
                    setInitializing(false);
                }
            }
        }

        void bootstrap();

        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        modeRef.current = mode;
    }, [mode]);

    useEffect(() => {
        let isMounted = true;
        async function loadAppearancePreferences() {
            try {
                const [storedMode, storedScale] = await Promise.all([
                    getPreferenceValue(THEME_MODE_PREFERENCE_KEY),
                    getPreferenceValue(FONT_SCALE_PREFERENCE_KEY),
                ]);

                if (storedMode === "dark" || storedMode === "light") {
                    setThemeMode(storedMode);
                }

                if (storedScale) {
                    const parsed = Number(storedScale);
                    if (Number.isFinite(parsed) && parsed >= 0.85 && parsed <= 1.3) {
                        setFontScale(parsed);
                    }
                }
            } catch (error) {
                console.warn("모양새 설정을 불러오는 중 문제가 발생했어요.", error);
            } finally {
                if (isMounted) {
                    setAppearanceReady(true);
                }
            }
        }

        void loadAppearancePreferences();

        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        let isMounted = true;
        getPreferenceValue(ONBOARDING_PREFERENCE_KEY)
            .then((value) => {
                if (!isMounted) {
                    return;
                }
                setIsOnboardingVisible(value !== "true");
            })
            .catch((error) => {
                console.warn("온보딩 상태를 불러오는 중 문제가 발생했어요.", error);
                if (isMounted) {
                    setIsOnboardingVisible(true);
                }
            });
        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        let isMounted = true;

        getSearchHistoryEntries()
            .then((history) => {
                if (isMounted) {
                    setRecentSearches(history);
                }
            })
            .catch((error) => {
                console.warn("검색 이력을 불러오는 중 문제가 발생했어요.", error);
            });

        return () => {
            isMounted = false;
        };
    }, []);

    const updateSearchHistory = useCallback(
        (term: string, dictionaryMode: DictionaryMode) => {
            const normalizedTerm = term.trim();
            if (!normalizedTerm) {
                return;
            }

            setRecentSearches((previous) => {
                const lowerTerm = normalizedTerm.toLowerCase();
                const filtered = previous.filter((entry) => entry.term.toLowerCase() !== lowerTerm);
                const entry: SearchHistoryEntry = {
                    term: normalizedTerm,
                    mode: dictionaryMode,
                    searchedAt: new Date().toISOString(),
                };
                const next = [entry, ...filtered].slice(0, SEARCH_HISTORY_LIMIT);
                persistSearchHistory(next);
                return next;
            });
        },
        [persistSearchHistory],
    );

    const handleClearRecentSearches = useCallback(() => {
        setRecentSearches([]);
        void clearSearchHistoryEntries().catch((error) => {
            console.warn("검색 이력을 삭제하는 중 문제가 발생했어요.", error);
        });
    }, [clearSearchHistoryEntries]);

    const handleThemeModeChange = useCallback((nextMode: ThemeMode) => {
        setThemeMode(nextMode);
        void setPreferenceValue(THEME_MODE_PREFERENCE_KEY, nextMode).catch((error) => {
            console.warn("테마 설정을 저장하는 중 문제가 발생했어요.", error);
        });
    }, []);

    const handleFontScaleChange = useCallback((scale: number) => {
        const clamped = Math.min(Math.max(scale, 0.85), 1.3);
        setFontScale(clamped);
        void setPreferenceValue(FONT_SCALE_PREFERENCE_KEY, clamped.toString()).catch((error) => {
            console.warn("글자 크기를 저장하는 중 문제가 발생했어요.", error);
        });
    }, []);

    const executeSearch = useCallback(async (term: string, dictionaryMode: DictionaryMode) => {
        const normalizedTerm = term.trim();
        if (!normalizedTerm) {
            activeLookupRef.current += 1;
            setErrorMessage(EMPTY_SEARCH_ERROR_MESSAGE, "ValidationError", { retryable: false });
            setResult(null);
            setExamplesVisible(false);
            setLoading(false);
            return;
        }

        const lookupId = activeLookupRef.current + 1;
        activeLookupRef.current = lookupId;

        setError(null);
        setLoading(true);
        setExamplesVisible(false);

        try {
            const { base, examplesPromise } = await getWordData(normalizedTerm, dictionaryMode);
            if (lookupId !== activeLookupRef.current) {
                return;
            }

            setResult(base);
            setLoading(false);

            void examplesPromise
                .then((updates) => {
                    if (lookupId !== activeLookupRef.current) {
                        return;
                    }
                    setResult((previous) => {
                        if (!previous) {
                            return previous;
                        }
                        if (updates.length === 0) {
                            return clearPendingFlags(previous);
                        }
                        return applyExampleUpdates(previous, updates, dictionaryMode);
                    });
                })
                .catch((err) => {
                    console.warn("예문 생성 중 문제가 발생했어요.", err);
                    if (lookupId !== activeLookupRef.current) {
                        return;
                    }
                    setResult((previous) => (previous ? clearPendingFlags(previous) : previous));
                });
        } catch (err) {
            if (lookupId !== activeLookupRef.current) {
                return;
            }
            setResult(null);
            setExamplesVisible(false);
            setLoading(false);
            const appError = normalizeError(err, GENERIC_ERROR_MESSAGE);
            setError(appError);
            if (appError.kind !== "ValidationError") {
                captureAppError(appError, { scope: "search.execute" });
            }
        }
    }, []);

    const handleSearchTermChange = useCallback((text: string) => {
        setSearchTerm(text);

        const trimmed = text.trim();
        if (!trimmed) {
            activeLookupRef.current += 1;
            setError(null);
            setLoading(false);
            setExamplesVisible(false);
            return;
        }
        // Cancel any in-flight result updates; user must submit explicitly.
        activeLookupRef.current += 1;
        setLoading(false);
    }, []);

    const handleSearch = useCallback(() => {
        const trimmed = searchTerm.trim();
        if (trimmed) {
            updateSearchHistory(trimmed, mode);
        }
        void executeSearch(searchTerm, mode);
    }, [executeSearch, mode, searchTerm, updateSearchHistory]);

    const handleSelectRecentSearch = useCallback(
        (entry: SearchHistoryEntry) => {
            const normalizedTerm = entry.term.trim();
            if (!normalizedTerm) {
                return;
            }
            setSearchTerm(normalizedTerm);
            if (modeRef.current !== entry.mode) {
                setMode(entry.mode);
                modeRef.current = entry.mode;
            }
            updateSearchHistory(normalizedTerm, entry.mode);
            void executeSearch(normalizedTerm, entry.mode);
        },
        [executeSearch, updateSearchHistory],
    );

    const handleModeChange = useCallback((nextMode: DictionaryMode) => {
        if (modeRef.current === nextMode) {
            return;
        }
        activeLookupRef.current += 1;
        setMode(nextMode);
        modeRef.current = nextMode;
        setResult(null);
        setError(null);
        setLoading(false);
        setExamplesVisible(false);
    }, []);

    const handleToggleExamples = useCallback(() => {
        setExamplesVisible((previous) => !previous);
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
                setError(null);
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
        [ensurePhoneticForWord, favorites, isGuest, removeFavoritePersisted, user],
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
            const message = err instanceof Error ? err.message : AUDIO_PLAY_ERROR_MESSAGE;
            setErrorMessage(message);
            Alert.alert(AUDIO_PLAY_ERROR_MESSAGE, message);
        }
    }, [result?.word, isPronunciationAvailable]);

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
                const message = err instanceof Error ? err.message : AUDIO_PLAY_ERROR_MESSAGE;
                Alert.alert(AUDIO_PLAY_ERROR_MESSAGE, message);
            }
        },
        [isPronunciationAvailable],
    );

    const setInitialAuthState = useCallback(() => {
        setIsGuest(false);
        setUser(null);
        setFavorites([]);
        setSearchTerm("");
        setResult(null);
        setExamplesVisible(false);
        setError(null);
        setAuthError(null);
    }, []);

    const handleGuestAccessAsync = useCallback(async () => {
        setAuthLoading(true);
        setAuthError(null);
        try {
            await setGuestSession();
            setIsGuest(true);
            setUser(null);
            setFavorites([]);
            setSearchTerm("");
            setResult(null);
            setExamplesVisible(false);
            setError(null);
        } catch (err) {
            const message = err instanceof Error ? err.message : GUEST_ACCESS_ERROR_MESSAGE;
            setAuthError(message);
        } finally {
            setAuthLoading(false);
        }
    }, []);

    const resetAuthState = useCallback(() => {
        setInitialAuthState();
        setAuthLoading(false);
    }, [setInitialAuthState]);

    const handleGuestAuthRedirectAsync = useCallback(async () => {
        setAuthError(null);
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
            await setUserSession(userRecord.id);
            const storedFavorites = await getFavoritesByUser(userRecord.id);
            const hydratedFavorites = await hydrateFavorites(storedFavorites, userRecord.id);
            setIsGuest(false);
            setUser(userRecord);
            setFavorites(hydratedFavorites);
            setSearchTerm("");
            setResult(null);
            setExamplesVisible(false);
            setError(null);
            setAuthError(null);
        },
        [hydrateFavorites],
    );

    const handleDismissHelp = useCallback(() => {
        setIsHelpVisible(false);
        markAppHelpSeen().catch((err) => {
            console.warn(HELP_MODAL_SAVE_ERROR_MESSAGE, err);
        });
    }, []);

    const handleShowOnboarding = useCallback(() => {
        setIsOnboardingVisible(true);
        void setPreferenceValue(ONBOARDING_PREFERENCE_KEY, "false").catch((error) => {
            console.warn("온보딩 상태를 업데이트하는 중 문제가 발생했어요.", error);
        });
    }, []);

    const handleCompleteOnboarding = useCallback(() => {
        setIsOnboardingVisible(false);
        void setPreferenceValue(ONBOARDING_PREFERENCE_KEY, "true").catch((error) => {
            console.warn("온보딩 상태를 저장하는 중 문제가 발생했어요.", error);
        });
    }, []);

    const handleLogoutAsync = useCallback(async () => {
        setAuthLoading(true);
        setAuthError(null);
        try {
            await clearSession();
            await clearAutoLoginCredentials();
        } catch (err) {
            const message = err instanceof Error ? err.message : LOGOUT_ERROR_MESSAGE;
            setAuthError(message);
        } finally {
            setAuthLoading(false);
            resetAuthState();
        }
    }, [resetAuthState]);

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
            setRecentSearches([]);
        } catch (error) {
            const message = error instanceof Error ? error.message : ACCOUNT_DELETION_ERROR_MESSAGE;
            throw new Error(message);
        }
    }, [
        clearAutoLoginCredentials,
        clearSearchHistoryEntries,
        clearSession,
        deleteUserAccount,
        setInitialAuthState,
        setRecentSearches,
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
                const { user: updatedUser, passwordHash } = await updateUserPassword(user.id, trimmedPassword);
                setUser(updatedUser);
            } catch (err) {
                const message = err instanceof Error ? err.message : PASSWORD_UPDATE_ERROR_MESSAGE;
                throw new Error(message);
            }
        },
        [user],
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
                const restored = await importBackupFromDocument(passphrase);
                if (!restored) {
                    return;
                }
                if (user?.username) {
                    const refreshed = await findUserByUsername(user.username);
                    if (refreshed) {
                        await loadUserState({
                            id: refreshed.id,
                            username: refreshed.username,
                            displayName: refreshed.displayName,
                        });
                    } else {
                        setInitialAuthState();
                    }
                }
                const history = await getSearchHistoryEntries();
                setRecentSearches(history);
                Alert.alert("복원 완료", "백업 데이터로 복원했어요.");
            } catch (error) {
                const message = error instanceof Error ? error.message : "백업 데이터를 불러오지 못했어요.";
                Alert.alert("복원 실패", message);
            }
        },
        [findUserByUsername, getSearchHistoryEntries, loadUserState, setInitialAuthState, user?.username],
    );

    const navigatorProps = useMemo<RootTabNavigatorProps>(
        () => ({
            favorites,
            onToggleFavorite: toggleFavorite,
            onUpdateFavoriteStatus: updateFavoriteStatus,
            onRemoveFavorite: handleRemoveFavorite,
            searchTerm,
            onChangeSearchTerm: handleSearchTermChange,
            onSubmitSearch: handleSearch,
            loading,
            error,
            result,
            examplesVisible,
            onToggleExamples: handleToggleExamples,
            isCurrentFavorite,
            onPlayPronunciation: playPronunciation,
            pronunciationAvailable: isPronunciationAvailable,
            mode,
            onModeChange: handleModeChange,
            themeMode,
            onThemeModeChange: handleThemeModeChange,
            fontScale,
            onFontScaleChange: handleFontScaleChange,
            recentSearches,
            onSelectRecentSearch: handleSelectRecentSearch,
            onClearRecentSearches: handleClearRecentSearches,
            onRetrySearch: handleSearch,
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
            error,
            examplesVisible,
            favorites,
            handleGuestLoginRequest,
            handleGuestSignUpRequest,
            handleSelectRecentSearch,
            handleToggleExamples,
            handleProfilePasswordUpdate,
            handleProfileUpdate,
            handleCheckDisplayName,
            handleShowOnboarding,
            handleDeleteAccount,
            handlePlayWordAudio,
            handleLogout,
            handleModeChange,
            handleThemeModeChange,
            handleFontScaleChange,
            handleRemoveFavorite,
            handleSearch,
            handleSearchTermChange,
            handleBackupExport,
            handleBackupImport,
            isCurrentFavorite,
            isGuest,
            loading,
            mode,
            themeMode,
            fontScale,
            recentSearches,
            playPronunciation,
            result,
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
            loading: authLoading,
            errorMessage: authError,
        }),
        [authError, authLoading, handleGuestAccess],
    );

    useEffect(() => {
        setUserContext(user?.id ?? null);
    }, [user?.id]);

    return {
        versionLabel,
        initializing,
        appearanceReady,
        isHelpVisible,
        isOnboardingVisible,
        isAuthenticated,
        loginBindings,
        navigatorProps,
        handleDismissHelp,
        onShowOnboarding: handleShowOnboarding,
        onCompleteOnboarding: handleCompleteOnboarding,
        themeMode,
        fontScale,
        onThemeModeChange: handleThemeModeChange,
        onFontScaleChange: handleFontScaleChange,
    };
}
