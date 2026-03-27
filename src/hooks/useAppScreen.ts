import { useCallback, useMemo, useRef, useState } from "react";
import { Alert } from "react-native";

import { normalizeAIProxyError } from "@/api/dictionary/aiProxyError";
import { getPronunciationAudio } from "@/api/dictionary/getPronunciationAudio";
import { FEATURE_FLAGS } from "@/config/featureFlags";
import { OPENAI_FEATURE_ENABLED } from "@/config/openAI";
import { getRuntimeConfig } from "@/config/runtime";
import type { AppError } from "@/errors/AppError";
import { shouldRetry } from "@/errors/AppError";
import { useAppearanceFlow } from "@/hooks/app/useAppearanceFlow";
import { useSearchFlow } from "@/hooks/app/useSearchFlow";
import type { SearchFlowBridge } from "@/hooks/app/useSessionFlow";
import { useSessionFlow } from "@/hooks/app/useSessionFlow";
import { captureAppError } from "@/logging/logger";
import type { RootTabNavigatorProps } from "@/navigation/RootTabNavigator.types";
import {
    AUDIO_PLAY_ERROR_MESSAGE,
    AUDIO_UNAVAILABLE_MESSAGE,
    DEFAULT_VERSION_LABEL,
} from "@/screens/App/AppScreen.constants";
import type { AppScreenHookResult } from "@/screens/App/AppScreen.types";
import type { WordResult } from "@/services/dictionary/types";
import type { ReviewOutcome, ReviewQueueItem } from "@/services/review";
import { createReviewProgressKey, deriveReviewQueue } from "@/services/review";
import { playRemoteAudio } from "@/utils/audio";

type ActiveReviewSessionState = {
    status: "active";
    queue: ReviewQueueItem[];
    currentIndex: number;
    completedCount: number;
    correctCount: number;
    incorrectCount: number;
    pending: boolean;
};

type CompleteReviewSessionState = {
    status: "complete";
    totalCount: number;
    completedCount: number;
    correctCount: number;
    incorrectCount: number;
};

type ReviewSessionState = ActiveReviewSessionState | CompleteReviewSessionState | null;

export function useAppScreen(): AppScreenHookResult {
    const [versionLabel] = useState(() => {
        return getRuntimeConfig().versionLabel ?? DEFAULT_VERSION_LABEL;
    });
    const appearanceFlow = useAppearanceFlow();
    const searchFlowBridgeRef = useRef<SearchFlowBridge | null>(null);
    const sessionFlow = useSessionFlow({
        searchFlowBridgeRef,
        setOnboardingVisible: appearanceFlow.setOnboardingVisible,
        syncOnboardingVisibilityAfterAuthentication: appearanceFlow.syncOnboardingVisibilityAfterAuthentication,
    });
    const searchFlow = useSearchFlow({
        favorites: sessionFlow.favorites,
        pronunciationAvailable: OPENAI_FEATURE_ENABLED,
    });

    searchFlowBridgeRef.current = {
        resetSearchState: searchFlow.resetSearchState,
        reloadRecentSearches: searchFlow.reloadRecentSearches,
        setErrorMessage: searchFlow.setErrorMessage,
        clearError: searchFlow.clearError,
    };

    const hasShownPronunciationInfoRef = useRef(false);

    const reportAiAssistError = useCallback((error: unknown, scope: "examples" | "tts"): AppError => {
        const appError = normalizeAIProxyError(error, scope);
        if (appError.kind !== "ValidationError") {
            captureAppError(appError, { scope: `ai.${scope}` });
        }
        return appError;
    }, []);

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
        const currentWord = searchFlow.result?.word?.trim();
        if (!currentWord) {
            Alert.alert(AUDIO_PLAY_ERROR_MESSAGE, AUDIO_UNAVAILABLE_MESSAGE);
            return;
        }

        if (!OPENAI_FEATURE_ENABLED) {
            if (!hasShownPronunciationInfoRef.current) {
                Alert.alert("발음 재생", "발음 기능은 현재 사용할 수 없습니다. 백엔드 연동 후 활성화됩니다.");
                hasShownPronunciationInfoRef.current = true;
            }
            return;
        }

        try {
            const uri = await getPronunciationAudio(currentWord);
            await playRemoteAudio(uri);
        } catch (error) {
            const appError = reportAiAssistError(error, "tts");
            showAudioErrorAlert(appError, () => {
                void playPronunciationAsync();
            });
        }
    }, [reportAiAssistError, searchFlow.result?.word, showAudioErrorAlert]);

    const handlePlayWordAudioAsync = useCallback(
        async (word: WordResult) => {
            const target = word.word?.trim();
            if (!target) {
                Alert.alert(AUDIO_PLAY_ERROR_MESSAGE, AUDIO_UNAVAILABLE_MESSAGE);
                return;
            }

            if (!OPENAI_FEATURE_ENABLED) {
                if (!hasShownPronunciationInfoRef.current) {
                    Alert.alert("발음 재생", "발음 기능은 현재 사용할 수 없습니다. 백엔드 연동 후 활성화됩니다.");
                    hasShownPronunciationInfoRef.current = true;
                }
                return;
            }

            try {
                const uri = await getPronunciationAudio(target);
                await playRemoteAudio(uri);
            } catch (error) {
                const appError = reportAiAssistError(error, "tts");
                showAudioErrorAlert(appError, () => {
                    void handlePlayWordAudioAsync(word);
                });
            }
        },
        [reportAiAssistError, showAudioErrorAlert],
    );

    const isCurrentFavorite = useMemo(() => {
        if (!searchFlow.result) {
            return false;
        }
        return sessionFlow.favorites.some((item) => item.word.word === searchFlow.result.word);
    }, [searchFlow.result, sessionFlow.favorites]);
    const collectionsEnabled = FEATURE_FLAGS.collections;
    const currentResultCollectionId = useMemo(() => {
        const currentWord = searchFlow.result?.word;
        if (!currentWord) {
            return null;
        }
        return sessionFlow.collectionMemberships[createReviewProgressKey(currentWord)] ?? null;
    }, [searchFlow.result?.word, sessionFlow.collectionMemberships]);

    const [reviewSession, setReviewSession] = useState<ReviewSessionState>(null);
    const reviewSessionRef = useRef<ReviewSessionState>(null);
    reviewSessionRef.current = reviewSession;

    const reviewDashboardEnabled = FEATURE_FLAGS.reviewLoop && FEATURE_FLAGS.reviewHomeDashboard;
    const reviewSessionEnabled = FEATURE_FLAGS.reviewLoop && FEATURE_FLAGS.reviewSessionUi;
    const dueReviewQueue = useMemo(
        () => deriveReviewQueue(sessionFlow.favorites, sessionFlow.reviewProgress),
        [sessionFlow.favorites, sessionFlow.reviewProgress],
    );
    const dueReviewCount = dueReviewQueue.length;

    const handleStartReviewSession = useCallback(() => {
        if (!reviewDashboardEnabled || !reviewSessionEnabled || dueReviewQueue.length === 0) {
            return;
        }

        setReviewSession({
            status: "active",
            queue: dueReviewQueue,
            currentIndex: 0,
            completedCount: 0,
            correctCount: 0,
            incorrectCount: 0,
            pending: false,
        });
    }, [dueReviewQueue, reviewDashboardEnabled, reviewSessionEnabled]);

    const handleCloseReviewSession = useCallback(() => {
        setReviewSession(null);
    }, []);

    const handleCreateCollectionForCurrentWord = useCallback(
        async (name: string) => {
            const currentWord = searchFlow.result?.word?.trim();
            if (!currentWord) {
                throw new Error("검색 결과가 없어요.");
            }

            const createdCollectionId = await sessionFlow.onCreateCollection(name);
            if (createdCollectionId) {
                await sessionFlow.onAssignWordToCollection(currentWord, createdCollectionId);
            }

            return createdCollectionId;
        },
        [searchFlow.result?.word, sessionFlow.onAssignWordToCollection, sessionFlow.onCreateCollection],
    );

    const handleAssignCurrentWordToCollection = useCallback(
        async (collectionId: string | null) => {
            const currentWord = searchFlow.result?.word?.trim();
            if (!currentWord) {
                throw new Error("검색 결과가 없어요.");
            }

            await sessionFlow.onAssignWordToCollection(currentWord, collectionId);
        },
        [searchFlow.result?.word, sessionFlow.onAssignWordToCollection],
    );

    const handleApplyReviewOutcome = useCallback(
        (outcome: ReviewOutcome) => {
            const currentSession = reviewSessionRef.current;
            if (!currentSession || currentSession.status !== "active" || currentSession.pending) {
                return;
            }

            const currentItem = currentSession.queue[currentSession.currentIndex];
            if (!currentItem) {
                return;
            }

            setReviewSession({
                ...currentSession,
                pending: true,
            });

            void (async () => {
                try {
                    await sessionFlow.onApplyReviewOutcome(currentItem.entry.word.word, outcome);
                    const completedCount = currentSession.completedCount + 1;
                    const correctCount = currentSession.correctCount + (outcome === "again" ? 0 : 1);
                    const incorrectCount = currentSession.incorrectCount + (outcome === "again" ? 1 : 0);
                    const nextIndex = currentSession.currentIndex + 1;

                    if (nextIndex >= currentSession.queue.length) {
                        setReviewSession({
                            status: "complete",
                            totalCount: currentSession.queue.length,
                            completedCount,
                            correctCount,
                            incorrectCount,
                        });
                        return;
                    }

                    setReviewSession({
                        status: "active",
                        queue: currentSession.queue,
                        currentIndex: nextIndex,
                        completedCount,
                        correctCount,
                        incorrectCount,
                        pending: false,
                    });
                } catch (error) {
                    setReviewSession({
                        ...currentSession,
                        pending: false,
                    });
                    Alert.alert("복습 실패", error instanceof Error ? error.message : "복습 결과를 저장하지 못했어요.");
                }
            })();
        },
        [sessionFlow.onApplyReviewOutcome],
    );

    const reviewSessionViewModel = useMemo(() => {
        if (!reviewSession) {
            return null;
        }

        if (reviewSession.status === "complete") {
            return reviewSession;
        }

        const currentItem = reviewSession.queue[reviewSession.currentIndex];
        if (!currentItem) {
            return null;
        }

        return {
            ...reviewSession,
            currentItem,
            totalCount: reviewSession.queue.length,
        };
    }, [reviewSession]);

    const navigatorProps = useMemo<RootTabNavigatorProps>(
        () => ({
            home: {
                favorites: sessionFlow.favorites,
                onMoveToStatus: sessionFlow.onUpdateFavoriteStatus,
                userName: sessionFlow.userName,
                onPlayWordAudio: (word: WordResult) => {
                    void handlePlayWordAudioAsync(word);
                },
                pronunciationAvailable: OPENAI_FEATURE_ENABLED,
                reviewEnabled: reviewDashboardEnabled && reviewSessionEnabled,
                reviewSummary: {
                    dueCount: dueReviewCount,
                    canStartReview: dueReviewCount > 0,
                },
                reviewSession: reviewSessionViewModel,
                onStartReviewSession: handleStartReviewSession,
                onCloseReviewSession: handleCloseReviewSession,
                onApplyReviewOutcome: handleApplyReviewOutcome,
            },
            favorites: {
                favorites: sessionFlow.favorites,
                onUpdateStatus: sessionFlow.onUpdateFavoriteStatus,
                onRemoveFavorite: sessionFlow.onRemoveFavorite,
                onPlayAudio: (word: WordResult) => {
                    void handlePlayWordAudioAsync(word);
                },
                pronunciationAvailable: OPENAI_FEATURE_ENABLED,
                collectionsEnabled,
                collections: sessionFlow.collections,
                collectionMemberships: sessionFlow.collectionMemberships,
                onCreateCollection: sessionFlow.onCreateCollection,
                onRenameCollection: sessionFlow.onRenameCollection,
                onDeleteCollection: sessionFlow.onDeleteCollection,
                onAssignWordToCollection: sessionFlow.onAssignWordToCollection,
            },
            search: {
                searchTerm: searchFlow.searchTerm,
                hasSearched: searchFlow.hasSearched,
                onChangeSearchTerm: searchFlow.onChangeSearchTerm,
                onSubmit: searchFlow.onSubmitSearch,
                loading: searchFlow.loading,
                error: searchFlow.error,
                aiAssistError: searchFlow.aiAssistError,
                result: searchFlow.result,
                examplesVisible: searchFlow.examplesVisible,
                onToggleExamples: searchFlow.onToggleExamples,
                onToggleFavorite: sessionFlow.onToggleFavorite,
                isCurrentFavorite,
                onPlayPronunciation: () => {
                    void playPronunciationAsync();
                },
                pronunciationAvailable: OPENAI_FEATURE_ENABLED,
                autocompleteSuggestions: searchFlow.autocompleteSuggestions,
                autocompleteLoading: searchFlow.autocompleteLoading,
                onSelectAutocomplete: searchFlow.onSelectAutocomplete,
                recentSearches: searchFlow.recentSearches,
                onSelectRecentSearch: searchFlow.onSelectRecentSearch,
                onClearRecentSearches: searchFlow.onClearRecentSearches,
                onRetry: searchFlow.onRetrySearch,
                onRetryAiAssist: searchFlow.onRetryAiAssist,
                onRegenerateExamples: searchFlow.onRegenerateExamples,
                collectionsEnabled,
                collections: sessionFlow.collections,
                currentCollectionId: currentResultCollectionId,
                onAssignCurrentWordToCollection: handleAssignCurrentWordToCollection,
                onCreateCollectionForCurrentWord: handleCreateCollectionForCurrentWord,
            },
            settings: {
                onLogout: sessionFlow.onLogout,
                canLogout: sessionFlow.canLogout,
                isGuest: sessionFlow.isGuest,
                onRequestLogin: sessionFlow.onRequestLogin,
                onRequestSignUp: sessionFlow.onRequestSignUp,
                appVersion: versionLabel,
                profileDisplayName: sessionFlow.profileDisplayName,
                profileUsername: sessionFlow.profileUsername,
                onUpdateProfile: sessionFlow.onUpdateProfile,
                onCheckDisplayName: sessionFlow.onCheckDisplayName,
                onUpdatePassword: sessionFlow.onUpdatePassword,
                onDeleteAccount: sessionFlow.onDeleteAccount,
                onExportBackup: sessionFlow.onExportBackup,
                onImportBackup: sessionFlow.onImportBackup,
                onShowOnboarding: appearanceFlow.onShowOnboarding,
                themeMode: appearanceFlow.themeMode,
                onThemeModeChange: appearanceFlow.onThemeModeChange,
                fontScale: appearanceFlow.fontScale,
                onFontScaleChange: appearanceFlow.onFontScaleChange,
            },
        }),
        [
            appearanceFlow.fontScale,
            appearanceFlow.onFontScaleChange,
            appearanceFlow.onShowOnboarding,
            appearanceFlow.onThemeModeChange,
            appearanceFlow.themeMode,
            collectionsEnabled,
            currentResultCollectionId,
            dueReviewCount,
            handleApplyReviewOutcome,
            handleAssignCurrentWordToCollection,
            handleCloseReviewSession,
            handleCreateCollectionForCurrentWord,
            handlePlayWordAudioAsync,
            handleStartReviewSession,
            isCurrentFavorite,
            playPronunciationAsync,
            reviewDashboardEnabled,
            reviewSessionEnabled,
            reviewSessionViewModel,
            searchFlow.aiAssistError,
            searchFlow.autocompleteLoading,
            searchFlow.autocompleteSuggestions,
            searchFlow.error,
            searchFlow.examplesVisible,
            searchFlow.hasSearched,
            searchFlow.loading,
            searchFlow.onChangeSearchTerm,
            searchFlow.onClearRecentSearches,
            searchFlow.onRegenerateExamples,
            searchFlow.onRetryAiAssist,
            searchFlow.onRetrySearch,
            searchFlow.onSelectAutocomplete,
            searchFlow.onSelectRecentSearch,
            searchFlow.onSubmitSearch,
            searchFlow.onToggleExamples,
            searchFlow.recentSearches,
            searchFlow.result,
            searchFlow.searchTerm,
            sessionFlow.canLogout,
            sessionFlow.collectionMemberships,
            sessionFlow.collections,
            sessionFlow.favorites,
            sessionFlow.isGuest,
            sessionFlow.onApplyReviewOutcome,
            sessionFlow.onCheckDisplayName,
            sessionFlow.onCreateCollection,
            sessionFlow.onDeleteAccount,
            sessionFlow.onDeleteCollection,
            sessionFlow.onExportBackup,
            sessionFlow.onImportBackup,
            sessionFlow.onLogout,
            sessionFlow.onRemoveFavorite,
            sessionFlow.onRequestLogin,
            sessionFlow.onRequestSignUp,
            sessionFlow.onRenameCollection,
            sessionFlow.onToggleFavorite,
            sessionFlow.onAssignWordToCollection,
            sessionFlow.onUpdateFavoriteStatus,
            sessionFlow.onUpdatePassword,
            sessionFlow.onUpdateProfile,
            sessionFlow.profileDisplayName,
            sessionFlow.profileUsername,
            sessionFlow.userName,
            versionLabel,
        ],
    );

    const loginBindings = sessionFlow.loginBindings;

    return {
        versionLabel,
        initializing: sessionFlow.initializing,
        appearanceReady: appearanceFlow.appearanceReady,
        isOnboardingVisible: appearanceFlow.isOnboardingVisible,
        isAuthenticated: sessionFlow.isAuthenticated,
        loginBindings,
        navigatorProps,
        onShowOnboarding: appearanceFlow.onShowOnboarding,
        onCompleteOnboarding: appearanceFlow.onCompleteOnboarding,
        themeMode: appearanceFlow.themeMode,
        fontScale: appearanceFlow.fontScale,
        onThemeModeChange: appearanceFlow.onThemeModeChange,
        onFontScaleChange: appearanceFlow.onFontScaleChange,
    };
}
