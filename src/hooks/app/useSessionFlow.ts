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
import {
    assignWordsToCollection,
    createCollection,
    deleteCollection,
    getCollectionMembershipMap,
    mergeCollectionsByName,
    removeWordsFromCollections,
    renameCollection,
} from "@/services/collections";
import { mergeGuestCollections, parseGuestCollections } from "@/services/collections/guestCollections";
import type { CollectionMembershipMap, CollectionRecord } from "@/services/collections/types";
import {
    clearAutoLoginCredentials,
    clearSearchHistoryEntries,
    clearSession,
    createUser,
    deleteUserAccount,
    findUserByUsername,
    getActiveSession,
    getCollectionsByUser,
    getFavoritesByUser,
    getPreferenceValue,
    getReviewProgressByUser,
    initializeDatabase,
    isDisplayNameTaken,
    removeFavoriteForUser,
    removeReviewProgressForUser,
    resetPasswordWithEmailCode,
    saveAutoLoginCredentials,
    sendEmailVerificationCode,
    setCollectionsForUser,
    setGuestSession,
    setPreferenceValue,
    setUserSession,
    updateUserDisplayName,
    updateUserPassword,
    upsertFavoriteForUser,
    upsertReviewProgressForUser,
    type UserRecord,
    verifyPasswordHash,
} from "@/services/database";
import type { WordResult } from "@/services/dictionary/types";
import { clearPendingFlags } from "@/services/dictionary/utils/mergeExampleUpdates";
import { mergeFavoriteEntries, parseGuestFavoriteEntries } from "@/services/favorites/guestFavorites";
import { createFavoriteEntry, type FavoriteWordEntry, type MemorizationStatus } from "@/services/favorites/types";
import { mergeGuestReviewProgress, parseGuestReviewProgress } from "@/services/review/guestReviewProgress";
import { applyReviewOutcome, createReviewProgressKey } from "@/services/review/reviewQueue";
import type { ReviewOutcome, ReviewProgressMap } from "@/services/review/types";
import {
    GUEST_COLLECTIONS_PREFERENCE_KEY,
    GUEST_FAVORITES_PREFERENCE_KEY,
    GUEST_REVIEW_PROGRESS_PREFERENCE_KEY,
    GUEST_USED_PREFERENCE_KEY,
} from "@/theme/constants";
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
    collections: CollectionRecord[];
    collectionMemberships: CollectionMembershipMap;
    reviewProgress: ReviewProgressMap;
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
    onApplyReviewOutcome: (word: string, outcome: ReviewOutcome) => Promise<void>;
    onCreateCollection: (name: string) => Promise<string | null>;
    onRenameCollection: (collectionId: string, name: string) => Promise<void>;
    onDeleteCollection: (collectionId: string) => Promise<void>;
    onAssignWordToCollection: (word: string, collectionId: string | null) => Promise<void>;
};

export function useSessionFlow({
    searchFlowBridgeRef,
    setOnboardingVisible,
    syncOnboardingVisibilityAfterAuthentication,
}: UseSessionFlowArgs): UseSessionFlowResult {
    const [favorites, setFavorites] = useState<FavoriteWordEntry[]>([]);
    const [collections, setCollections] = useState<CollectionRecord[]>([]);
    const [reviewProgress, setReviewProgress] = useState<ReviewProgressMap>({});
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

    const normalizeCollectionName = useCallback((name: string) => name.trim(), []);

    const findFavoriteByWord = useCallback((entries: FavoriteWordEntry[], word: string) => {
        const key = createReviewProgressKey(word);
        return entries.find((item) => createReviewProgressKey(item.word.word) === key) ?? null;
    }, []);

    const removeReviewProgressByWord = useCallback((progress: ReviewProgressMap, word: string): ReviewProgressMap => {
        const key = createReviewProgressKey(word);
        if (!key || !progress[key]) {
            return progress;
        }

        const next = { ...progress };
        delete next[key];
        return next;
    }, []);

    const validateCollectionName = useCallback(
        (name: string, existingCollections: CollectionRecord[], collectionId?: string | null) => {
            const normalizedName = normalizeCollectionName(name);
            if (!normalizedName) {
                throw new Error("컬렉션 이름을 입력해주세요.");
            }

            const duplicated = existingCollections.some(
                (collection) =>
                    collection.id !== collectionId &&
                    normalizeCollectionName(collection.name).toLowerCase() === normalizedName.toLowerCase(),
            );
            if (duplicated) {
                throw new Error("같은 이름의 컬렉션이 이미 있어요.");
            }

            return normalizedName;
        },
        [normalizeCollectionName],
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
        [ensurePhoneticForWord],
    );

    const setInitialAuthState = useCallback(() => {
        setIsGuest(false);
        setUser(null);
        setFavorites([]);
        setCollections([]);
        setReviewProgress({});
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
            const [storedFavorites, storedCollections, storedReviewProgress] = await Promise.all([
                getFavoritesByUser(userRecord.id),
                getCollectionsByUser(userRecord.id),
                getReviewProgressByUser(userRecord.id),
            ]);
            const hydratedFavorites = await hydrateFavorites(storedFavorites, userRecord.id);

            let nextFavorites = hydratedFavorites;
            let nextCollections = storedCollections;
            let nextReviewProgress = storedReviewProgress;
            let mergedCount = 0;
            try {
                const [rawGuestFavorites, rawGuestCollections, rawGuestReviewProgress] = await Promise.all([
                    getPreferenceValue(GUEST_FAVORITES_PREFERENCE_KEY),
                    getPreferenceValue(GUEST_COLLECTIONS_PREFERENCE_KEY),
                    getPreferenceValue(GUEST_REVIEW_PROGRESS_PREFERENCE_KEY),
                ]);
                const guestFavorites = parseGuestFavoriteEntries(rawGuestFavorites);
                const guestCollections = parseGuestCollections(rawGuestCollections);
                const guestReviewProgress = parseGuestReviewProgress(rawGuestReviewProgress);
                if (guestFavorites.length > 0) {
                    nextFavorites = mergeFavoriteEntries(hydratedFavorites, guestFavorites);
                    mergedCount = nextFavorites.length - hydratedFavorites.length;
                    await Promise.all(nextFavorites.map((entry) => upsertFavoriteForUser(userRecord.id, entry)));
                    await setPreferenceValue(GUEST_FAVORITES_PREFERENCE_KEY, "[]");
                }
                if (guestCollections.length > 0) {
                    nextCollections = mergeGuestCollections(storedCollections, guestCollections);
                    await setCollectionsForUser(userRecord.id, nextCollections);
                    await setPreferenceValue(GUEST_COLLECTIONS_PREFERENCE_KEY, "[]");
                }
                if (Object.keys(guestReviewProgress).length > 0) {
                    nextReviewProgress = mergeGuestReviewProgress(storedReviewProgress, guestReviewProgress);
                    await Promise.all(
                        Object.values(nextReviewProgress).map((entry) =>
                            upsertReviewProgressForUser(userRecord.id, entry),
                        ),
                    );
                    await setPreferenceValue(GUEST_REVIEW_PROGRESS_PREFERENCE_KEY, "{}");
                }
            } catch (error) {
                console.warn("게스트 학습 상태 병합 중 문제가 발생했어요.", error);
            }

            setIsGuest(false);
            setUser(userRecord);
            setFavorites(nextFavorites);
            setCollections(nextCollections);
            setReviewProgress(nextReviewProgress);
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
            const [rawGuestFavorites, rawGuestCollections, rawGuestReviewProgress] = await Promise.all([
                getPreferenceValue(GUEST_FAVORITES_PREFERENCE_KEY),
                getPreferenceValue(GUEST_COLLECTIONS_PREFERENCE_KEY),
                getPreferenceValue(GUEST_REVIEW_PROGRESS_PREFERENCE_KEY),
            ]);
            const guestFavorites = await hydrateFavorites(parseGuestFavoriteEntries(rawGuestFavorites));
            const guestCollections = parseGuestCollections(rawGuestCollections);
            const guestReviewProgress = parseGuestReviewProgress(rawGuestReviewProgress);
            setIsGuest(true);
            setUser(null);
            setFavorites(guestFavorites);
            setCollections(guestCollections);
            setReviewProgress(guestReviewProgress);
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
        setCollections([]);
        setReviewProgress({});
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

    useEffect(() => {
        if (!isGuest) {
            return;
        }

        void setPreferenceValue(GUEST_COLLECTIONS_PREFERENCE_KEY, JSON.stringify(collections)).catch((error) => {
            console.warn("게스트 컬렉션을 저장하는 중 문제가 발생했어요.", error);
        });
    }, [collections, isGuest]);

    useEffect(() => {
        if (!isGuest) {
            return;
        }

        void setPreferenceValue(GUEST_REVIEW_PROGRESS_PREFERENCE_KEY, JSON.stringify(reviewProgress)).catch((error) => {
            console.warn("게스트 복습 진행도를 저장하는 중 문제가 발생했어요.", error);
        });
    }, [isGuest, reviewProgress]);

    const removeFavoritePersisted = useCallback(
        async (word: string) => {
            if (!user) {
                reportSearchError(MISSING_USER_ERROR_MESSAGE, "AuthError");
                return;
            }

            const previousFavorites = favorites;
            const previousCollections = collections;
            const previousReviewProgress = reviewProgress;
            const target = findFavoriteByWord(previousFavorites, word);
            if (!target) {
                return;
            }

            const nextFavorites = previousFavorites.filter(
                (item) => createReviewProgressKey(item.word.word) !== createReviewProgressKey(target.word.word),
            );
            const nextCollections = removeWordsFromCollections(previousCollections, [target.word.word]);
            const nextReviewProgress = removeReviewProgressByWord(previousReviewProgress, target.word.word);
            setFavorites(nextFavorites);
            setCollections(nextCollections);
            setReviewProgress(nextReviewProgress);

            try {
                await Promise.all([
                    removeFavoriteForUser(user.id, target.word.word),
                    setCollectionsForUser(user.id, nextCollections),
                    removeReviewProgressForUser(user.id, target.word.word),
                ]);
            } catch (error) {
                setFavorites(previousFavorites);
                setCollections(previousCollections);
                setReviewProgress(previousReviewProgress);
                const message = error instanceof Error ? error.message : REMOVE_FAVORITE_ERROR_MESSAGE;
                reportSearchError(message);
            }
        },
        [
            collections,
            favorites,
            findFavoriteByWord,
            removeReviewProgressByWord,
            reportSearchError,
            reviewProgress,
            user,
        ],
    );

    const toggleFavoriteAsync = useCallback(
        async (word: WordResult) => {
            const wordWithPhonetic = await ensurePhoneticForWord(word);
            const normalizedWord = clearPendingFlags(wordWithPhonetic);
            const previousFavorites = favorites;
            const existingEntry = findFavoriteByWord(previousFavorites, word.word);

            if (isGuest) {
                if (!existingEntry && previousFavorites.length >= 10) {
                    reportSearchError(FAVORITE_LIMIT_MESSAGE, "ValidationError", { retryable: false });
                    return;
                }
                clearSearchError();
                if (existingEntry) {
                    setCollections((previous) => removeWordsFromCollections(previous, [existingEntry.word.word]));
                    setFavorites(
                        previousFavorites.filter(
                            (item) =>
                                createReviewProgressKey(item.word.word) !==
                                createReviewProgressKey(existingEntry.word.word),
                        ),
                    );
                    setReviewProgress((previous) => removeReviewProgressByWord(previous, existingEntry.word.word));
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
                void removeFavoritePersisted(existingEntry.word.word);
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
        [
            clearSearchError,
            ensurePhoneticForWord,
            favorites,
            findFavoriteByWord,
            isGuest,
            removeFavoritePersisted,
            removeReviewProgressByWord,
            reportSearchError,
            user,
        ],
    );

    const updateFavoriteStatusAsync = useCallback(
        async (word: string, nextStatus: MemorizationStatus) => {
            const previousFavorites = favorites;
            const target = findFavoriteByWord(previousFavorites, word);
            if (!target) {
                return;
            }

            const updatedEntry: FavoriteWordEntry = {
                ...target,
                status: nextStatus,
                updatedAt: new Date().toISOString(),
            };
            const nextFavorites = previousFavorites.map((item) =>
                createReviewProgressKey(item.word.word) === createReviewProgressKey(target.word.word)
                    ? updatedEntry
                    : item,
            );
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
        [favorites, findFavoriteByWord, isGuest, reportSearchError, user],
    );

    const applyReviewOutcomeAsync = useCallback(
        async (word: string, outcome: ReviewOutcome) => {
            const previousFavorites = favorites;
            const previousReviewProgress = reviewProgress;
            const target = findFavoriteByWord(previousFavorites, word);
            if (!target) {
                return;
            }

            const progressKey = createReviewProgressKey(target.word.word);
            const currentProgress = previousReviewProgress[progressKey] ?? null;
            const result = applyReviewOutcome(target, currentProgress, outcome);
            const updatedAt = result.progress.lastReviewedAt ?? new Date().toISOString();
            const updatedEntry: FavoriteWordEntry = {
                ...target,
                status: result.status,
                updatedAt,
            };
            const nextFavorites = previousFavorites.map((item) =>
                createReviewProgressKey(item.word.word) === progressKey ? updatedEntry : item,
            );
            const nextReviewProgress = {
                ...previousReviewProgress,
                [progressKey]: result.progress,
            };

            setFavorites(nextFavorites);
            setReviewProgress(nextReviewProgress);

            if (isGuest) {
                return;
            }

            if (!user) {
                setFavorites(previousFavorites);
                setReviewProgress(previousReviewProgress);
                throw new Error(MISSING_USER_ERROR_MESSAGE);
            }

            try {
                await Promise.all([
                    upsertFavoriteForUser(user.id, updatedEntry),
                    upsertReviewProgressForUser(user.id, result.progress),
                ]);
            } catch (error) {
                setFavorites(previousFavorites);
                setReviewProgress(previousReviewProgress);
                const message = error instanceof Error ? error.message : UPDATE_STATUS_ERROR_MESSAGE;
                throw new Error(message);
            }
        },
        [favorites, findFavoriteByWord, isGuest, reviewProgress, user],
    );

    const handleRemoveFavorite = useCallback(
        (word: string) => {
            if (isGuest) {
                setCollections((previous) => removeWordsFromCollections(previous, [word]));
                setFavorites((previous) =>
                    previous.filter(
                        (item) => createReviewProgressKey(item.word.word) !== createReviewProgressKey(word),
                    ),
                );
                setReviewProgress((previous) => removeReviewProgressByWord(previous, word));
                return;
            }

            void removeFavoritePersisted(word);
        },
        [isGuest, removeFavoritePersisted, removeReviewProgressByWord],
    );

    const createCollectionAsync = useCallback(
        async (name: string) => {
            const normalizedName = validateCollectionName(name, collections);
            const nextCollection = createCollection(normalizedName);
            const previousCollections = collections;
            const nextCollections = [...previousCollections, nextCollection];

            setCollections(nextCollections);

            if (isGuest) {
                return nextCollection.id;
            }

            if (!user) {
                setCollections(previousCollections);
                throw new Error(MISSING_USER_ERROR_MESSAGE);
            }

            try {
                await setCollectionsForUser(user.id, nextCollections);
                return nextCollection.id;
            } catch (error) {
                setCollections(previousCollections);
                throw new Error(error instanceof Error ? error.message : "컬렉션을 만들지 못했어요.");
            }
        },
        [collections, isGuest, user, validateCollectionName],
    );

    const renameCollectionAsync = useCallback(
        async (collectionId: string, name: string) => {
            const normalizedName = validateCollectionName(name, collections, collectionId);
            const previousCollections = collections;
            const nextCollections = renameCollection(previousCollections, collectionId, normalizedName);
            setCollections(nextCollections);

            if (isGuest) {
                return;
            }

            if (!user) {
                setCollections(previousCollections);
                throw new Error(MISSING_USER_ERROR_MESSAGE);
            }

            try {
                await setCollectionsForUser(user.id, nextCollections);
            } catch (error) {
                setCollections(previousCollections);
                throw new Error(error instanceof Error ? error.message : "컬렉션 이름을 바꾸지 못했어요.");
            }
        },
        [collections, isGuest, user, validateCollectionName],
    );

    const deleteCollectionAsync = useCallback(
        async (collectionId: string) => {
            const previousCollections = collections;
            const nextCollections = deleteCollection(previousCollections, collectionId);
            setCollections(nextCollections);

            if (isGuest) {
                return;
            }

            if (!user) {
                setCollections(previousCollections);
                throw new Error(MISSING_USER_ERROR_MESSAGE);
            }

            try {
                await setCollectionsForUser(user.id, nextCollections);
            } catch (error) {
                setCollections(previousCollections);
                throw new Error(error instanceof Error ? error.message : "컬렉션을 삭제하지 못했어요.");
            }
        },
        [collections, isGuest, user],
    );

    const assignWordToCollectionAsync = useCallback(
        async (word: string, collectionId: string | null) => {
            const target = findFavoriteByWord(favorites, word);
            if (!target) {
                throw new Error("먼저 단어를 저장한 뒤 컬렉션을 정할 수 있어요.");
            }

            const previousCollections = collections;
            const nextCollections =
                collectionId == null
                    ? removeWordsFromCollections(previousCollections, [target.word.word])
                    : assignWordsToCollection(previousCollections, collectionId, [target.word.word]);

            setCollections(nextCollections);

            if (isGuest) {
                return;
            }

            if (!user) {
                setCollections(previousCollections);
                throw new Error(MISSING_USER_ERROR_MESSAGE);
            }

            try {
                await setCollectionsForUser(user.id, nextCollections);
            } catch (error) {
                setCollections(previousCollections);
                throw new Error(error instanceof Error ? error.message : "컬렉션을 저장하지 못했어요.");
            }
        },
        [collections, favorites, findFavoriteByWord, isGuest, user],
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
            setCollections([]);
            setReviewProgress({});
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
            const { exportBackupToFile } =
                require("@/services/backup/manualBackup") as typeof import("@/services/backup/manualBackup");
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
                const { importBackupFromDocument } =
                    require("@/services/backup/manualBackup") as typeof import("@/services/backup/manualBackup");
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

    const onApplyReviewOutcome = useCallback(
        async (word: string, outcome: ReviewOutcome) => {
            await applyReviewOutcomeAsync(word, outcome);
        },
        [applyReviewOutcomeAsync],
    );

    const onCreateCollection = useCallback(
        async (name: string) => {
            return await createCollectionAsync(name);
        },
        [createCollectionAsync],
    );

    const onRenameCollection = useCallback(
        async (collectionId: string, name: string) => {
            await renameCollectionAsync(collectionId, name);
        },
        [renameCollectionAsync],
    );

    const onDeleteCollection = useCallback(
        async (collectionId: string) => {
            await deleteCollectionAsync(collectionId);
        },
        [deleteCollectionAsync],
    );

    const onAssignWordToCollection = useCallback(
        async (word: string, collectionId: string | null) => {
            await assignWordToCollectionAsync(word, collectionId);
        },
        [assignWordToCollectionAsync],
    );

    const isAuthenticated = useMemo(() => isGuest || user !== null, [isGuest, user]);
    const canLogout = user !== null;
    const userName = user?.displayName ?? user?.username ?? DEFAULT_GUEST_NAME;
    const profileDisplayName = user?.displayName ?? null;
    const profileUsername = user?.username ?? null;
    const collectionMemberships = useMemo(() => getCollectionMembershipMap(collections), [collections]);

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
        collections,
        collectionMemberships,
        reviewProgress,
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
        onApplyReviewOutcome,
        onCreateCollection,
        onRenameCollection,
        onDeleteCollection,
        onAssignWordToCollection,
    };
}
