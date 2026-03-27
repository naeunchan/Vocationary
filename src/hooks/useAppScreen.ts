import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "react-native";

import { normalizeAIProxyError } from "@/api/dictionary/aiProxyError";
import { getPronunciationAudio, invalidatePronunciationAudioCache } from "@/api/dictionary/getPronunciationAudio";
import { FEATURE_FLAGS } from "@/config/featureFlags";
import { OPENAI_FEATURE_ENABLED } from "@/config/openAI";
import { getRuntimeConfig } from "@/config/runtime";
import type { AppError } from "@/errors/AppError";
import { isAppError, normalizeError, shouldRetry } from "@/errors/AppError";
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
import type { StudyModeSource, StudyModeViewModel } from "@/screens/StudyMode/StudyModeScreen.types";
import type { WordResult } from "@/services/dictionary/types";
import {
    computeDailyGoalProgress,
    createDefaultDailyGoalSettings,
    createDefaultReviewStreakState,
    type DailyGoalSettings,
    loadDailyGoalSettings,
    loadReviewStreakState,
    type ReviewStreakState,
    saveDailyGoalSettings,
    saveReviewStreakState,
    updateReviewStreak,
} from "@/services/goals";
import {
    createDefaultReviewReminderSettings,
    getNextReviewReminderAt,
    loadReviewReminderSettings,
    type ReviewReminderSettings,
    saveReviewReminderSettings,
} from "@/services/notifications";
import type { ReviewOutcome, ReviewQueueItem } from "@/services/review";
import { createReviewProgressKey, deriveReviewQueue } from "@/services/review";
import {
    countCorrectStudyAnswers,
    isStudyAnswerCorrect,
    loadAIStudySession,
    type StudySession,
} from "@/services/study";
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

type StudyModeContext = {
    source: StudyModeSource;
    word: WordResult;
};

type LoadingStudySessionState = StudyModeContext & {
    status: "loading";
};

type ErrorStudySessionState = StudyModeContext & {
    status: "error";
    error: AppError;
};

type ActiveStudySessionState = StudyModeContext & {
    status: "active";
    session: StudySession;
    currentIndex: number;
    answers: Record<string, string | undefined>;
};

type CompleteStudySessionState = StudyModeContext & {
    status: "complete";
    session: StudySession;
    answers: Record<string, string | undefined>;
};

type StudySessionState =
    | LoadingStudySessionState
    | ErrorStudySessionState
    | ActiveStudySessionState
    | CompleteStudySessionState
    | null;

function isSameCalendarDate(left: Date, right: Date): boolean {
    return (
        left.getFullYear() === right.getFullYear() &&
        left.getMonth() === right.getMonth() &&
        left.getDate() === right.getDate()
    );
}

function formatReminderLabel(value: Date | null): string | null {
    if (!value) {
        return null;
    }

    const period = value.getHours() >= 12 ? "오후" : "오전";
    const hour = value.getHours() % 12 || 12;
    const minute = `${value.getMinutes()}`.padStart(2, "0");
    return `${period} ${hour}:${minute}`;
}

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
    const [dailyGoalSettings, setDailyGoalSettings] = useState<DailyGoalSettings>(createDefaultDailyGoalSettings);
    const [reviewStreakState, setReviewStreakState] = useState<ReviewStreakState>(createDefaultReviewStreakState);
    const [reviewReminderSettings, setReviewReminderSettings] = useState<ReviewReminderSettings>(
        createDefaultReviewReminderSettings,
    );
    const reviewStreakStateRef = useRef(reviewStreakState);
    reviewStreakStateRef.current = reviewStreakState;

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

    useEffect(() => {
        let cancelled = false;

        void Promise.all([loadDailyGoalSettings(), loadReviewStreakState(), loadReviewReminderSettings()])
            .then(([loadedDailyGoalSettings, loadedReviewStreakState, loadedReminderSettings]) => {
                if (cancelled) {
                    return;
                }

                setDailyGoalSettings(loadedDailyGoalSettings);
                setReviewStreakState(loadedReviewStreakState);
                setReviewReminderSettings(loadedReminderSettings);
            })
            .catch(() => {
                // Fallback to defaults when local preferences are missing or malformed.
            });

        return () => {
            cancelled = true;
        };
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
            await invalidatePronunciationAudioCache(currentWord);
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
                await invalidatePronunciationAudioCache(target);
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
    const [studySession, setStudySession] = useState<StudySessionState>(null);
    const studySessionRef = useRef<StudySessionState>(null);
    studySessionRef.current = studySession;

    const reviewDashboardEnabled = FEATURE_FLAGS.reviewLoop && FEATURE_FLAGS.reviewHomeDashboard;
    const reviewSessionEnabled = FEATURE_FLAGS.reviewLoop && FEATURE_FLAGS.reviewSessionUi;
    const studyEntryEnabled = FEATURE_FLAGS.aiStudyMode && FEATURE_FLAGS.aiStudyEntryPoints;
    const studySessionEnabled = FEATURE_FLAGS.aiStudyMode && FEATURE_FLAGS.aiStudySessionUi;
    const studyAvailable = studyEntryEnabled && studySessionEnabled && OPENAI_FEATURE_ENABLED;
    const dailyGoalEnabled = FEATURE_FLAGS.dailyGoal;
    const reviewReminderEnabled = FEATURE_FLAGS.reviewReminder;
    const dueReviewQueue = useMemo(
        () => deriveReviewQueue(sessionFlow.favorites, sessionFlow.reviewProgress),
        [sessionFlow.favorites, sessionFlow.reviewProgress],
    );
    const dueReviewCount = dueReviewQueue.length;
    const completedTodayCount = useMemo(() => {
        const today = new Date();
        return Object.values(sessionFlow.reviewProgress).reduce((total, progress) => {
            if (!progress.lastReviewedAt) {
                return total;
            }

            const reviewedAt = new Date(progress.lastReviewedAt);
            if (!Number.isFinite(reviewedAt.getTime())) {
                return total;
            }

            return isSameCalendarDate(reviewedAt, today) ? total + 1 : total;
        }, 0);
    }, [sessionFlow.reviewProgress]);
    const dailyGoalProgress = useMemo(
        () => computeDailyGoalProgress(completedTodayCount, dailyGoalSettings),
        [completedTodayCount, dailyGoalSettings],
    );
    const nextReminderLabel = useMemo(
        () =>
            reviewReminderSettings.enabled
                ? formatReminderLabel(getNextReviewReminderAt(reviewReminderSettings))
                : null,
        [reviewReminderSettings],
    );

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

    const loadStudySessionAsync = useCallback(async (context: StudyModeContext, options?: { forceFresh?: boolean }) => {
        setStudySession({
            status: "loading",
            ...context,
        });

        try {
            const session = await loadAIStudySession(context.word.word, context.word.meanings, {
                forceFresh: options?.forceFresh,
            });

            setStudySession({
                status: "active",
                ...context,
                session,
                currentIndex: 0,
                answers: {},
            });
        } catch (error) {
            const normalized = isAppError(error)
                ? error
                : normalizeError(error, "학습 내용을 불러오지 못했어요. 다시 시도해주세요.");

            setStudySession({
                status: "error",
                ...context,
                error: normalized,
            });
        }
    }, []);

    const handleStartStudySession = useCallback(
        (source: StudyModeSource, word: WordResult) => {
            if (!studyAvailable) {
                return;
            }

            void loadStudySessionAsync({ source, word });
        },
        [loadStudySessionAsync, studyAvailable],
    );

    const handleRetryStudySession = useCallback(() => {
        const currentStudySession = studySessionRef.current;
        if (!currentStudySession) {
            return;
        }

        void loadStudySessionAsync(
            {
                source: currentStudySession.source,
                word: currentStudySession.word,
            },
            { forceFresh: false },
        );
    }, [loadStudySessionAsync]);

    const handleRegenerateStudySession = useCallback(() => {
        const currentStudySession = studySessionRef.current;
        if (!currentStudySession) {
            return;
        }

        void loadStudySessionAsync(
            {
                source: currentStudySession.source,
                word: currentStudySession.word,
            },
            { forceFresh: true },
        );
    }, [loadStudySessionAsync]);

    const handleCloseStudySession = useCallback(() => {
        setStudySession(null);
    }, []);

    const handleSelectStudyChoice = useCallback((value: string) => {
        const currentStudySession = studySessionRef.current;
        if (!currentStudySession || currentStudySession.status !== "active") {
            return;
        }

        const currentCard = currentStudySession.session.cards[currentStudySession.currentIndex];
        if (!currentCard || currentStudySession.answers[currentCard.id] !== undefined) {
            return;
        }

        setStudySession({
            ...currentStudySession,
            answers: {
                ...currentStudySession.answers,
                [currentCard.id]: value,
            },
        });
    }, []);

    const handleAdvanceStudyCard = useCallback(() => {
        const currentStudySession = studySessionRef.current;
        if (!currentStudySession || currentStudySession.status !== "active") {
            return;
        }

        const currentCard = currentStudySession.session.cards[currentStudySession.currentIndex];
        if (!currentCard || currentStudySession.answers[currentCard.id] === undefined) {
            return;
        }

        const nextIndex = currentStudySession.currentIndex + 1;
        if (nextIndex >= currentStudySession.session.cards.length) {
            setStudySession({
                status: "complete",
                source: currentStudySession.source,
                word: currentStudySession.word,
                session: currentStudySession.session,
                answers: currentStudySession.answers,
            });
            return;
        }

        setStudySession({
            ...currentStudySession,
            currentIndex: nextIndex,
        });
    }, []);

    const handleToggleDailyGoal = useCallback(
        (enabled: boolean) => {
            const previousSettings = dailyGoalSettings;
            const nextSettings: DailyGoalSettings = {
                ...dailyGoalSettings,
                enabled,
                updatedAt: new Date().toISOString(),
            };

            setDailyGoalSettings(nextSettings);
            void saveDailyGoalSettings(nextSettings).catch((error) => {
                setDailyGoalSettings(previousSettings);
                Alert.alert("오늘 목표", error instanceof Error ? error.message : "목표 설정을 저장하지 못했어요.");
            });
        },
        [dailyGoalSettings],
    );

    const handleSelectDailyGoalTarget = useCallback(
        (targetCount: number) => {
            const previousSettings = dailyGoalSettings;
            const nextSettings: DailyGoalSettings = {
                ...dailyGoalSettings,
                enabled: true,
                targetCount,
                updatedAt: new Date().toISOString(),
            };

            setDailyGoalSettings(nextSettings);
            void saveDailyGoalSettings(nextSettings).catch((error) => {
                setDailyGoalSettings(previousSettings);
                Alert.alert("오늘 목표", error instanceof Error ? error.message : "목표 설정을 저장하지 못했어요.");
            });
        },
        [dailyGoalSettings],
    );

    const handleToggleReviewReminder = useCallback(
        (enabled: boolean) => {
            const previousSettings = reviewReminderSettings;
            const nextSettings: ReviewReminderSettings = {
                ...reviewReminderSettings,
                enabled,
                updatedAt: new Date().toISOString(),
            };

            setReviewReminderSettings(nextSettings);
            void saveReviewReminderSettings(nextSettings).catch((error) => {
                setReviewReminderSettings(previousSettings);
                Alert.alert("리마인더", error instanceof Error ? error.message : "리마인더 설정을 저장하지 못했어요.");
            });
        },
        [reviewReminderSettings],
    );

    const handleSelectReviewReminderTime = useCallback(
        (hour: number, minute: number) => {
            const previousSettings = reviewReminderSettings;
            const nextSettings: ReviewReminderSettings = {
                ...reviewReminderSettings,
                enabled: true,
                hour,
                minute,
                updatedAt: new Date().toISOString(),
            };

            setReviewReminderSettings(nextSettings);
            void saveReviewReminderSettings(nextSettings).catch((error) => {
                setReviewReminderSettings(previousSettings);
                Alert.alert("리마인더", error instanceof Error ? error.message : "리마인더 설정을 저장하지 못했어요.");
            });
        },
        [reviewReminderSettings],
    );

    const handleToggleReviewReminderWeekday = useCallback(
        (weekday: number) => {
            const previousSettings = reviewReminderSettings;
            const alreadySelected = reviewReminderSettings.weekdays.includes(weekday);
            const nextWeekdays = alreadySelected
                ? reviewReminderSettings.weekdays.length === 1
                    ? reviewReminderSettings.weekdays
                    : reviewReminderSettings.weekdays.filter((entry) => entry !== weekday)
                : [...reviewReminderSettings.weekdays, weekday];
            const orderedWeekdays = [1, 2, 3, 4, 5, 6, 0].filter((entry) => nextWeekdays.includes(entry));
            const nextSettings: ReviewReminderSettings = {
                ...reviewReminderSettings,
                enabled: true,
                weekdays: orderedWeekdays,
                updatedAt: new Date().toISOString(),
            };

            setReviewReminderSettings(nextSettings);
            void saveReviewReminderSettings(nextSettings).catch((error) => {
                setReviewReminderSettings(previousSettings);
                Alert.alert("리마인더", error instanceof Error ? error.message : "리마인더 설정을 저장하지 못했어요.");
            });
        },
        [reviewReminderSettings],
    );

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
                    const nextStreakState = updateReviewStreak(reviewStreakStateRef.current, { completedCount: 1 });
                    setReviewStreakState(nextStreakState);
                    reviewStreakStateRef.current = nextStreakState;
                    void saveReviewStreakState(nextStreakState).catch(() => {
                        // Keep the in-memory streak optimistic even if the preference write fails.
                    });
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
    const studySessionViewModel = useMemo<StudyModeViewModel | null>(() => {
        if (!studySession) {
            return null;
        }

        if (studySession.status === "loading") {
            return studySession;
        }

        if (studySession.status === "error") {
            return {
                ...studySession,
                retryable: shouldRetry(studySession.error),
            };
        }

        if (studySession.status === "complete") {
            return {
                ...studySession,
                totalCount: studySession.session.cards.length,
                correctCount: countCorrectStudyAnswers(studySession.session.cards, studySession.answers),
            };
        }

        const currentCard = studySession.session.cards[studySession.currentIndex];
        if (!currentCard) {
            return null;
        }

        const selectedAnswer = studySession.answers[currentCard.id] ?? null;
        return {
            source: studySession.source,
            status: "active",
            word: studySession.word,
            currentCard,
            currentIndex: studySession.currentIndex,
            totalCount: studySession.session.cards.length,
            completedCount: Object.keys(studySession.answers).length,
            correctCount: countCorrectStudyAnswers(studySession.session.cards, studySession.answers),
            selectedAnswer,
            answerSubmitted: selectedAnswer !== null,
            isCurrentAnswerCorrect: selectedAnswer !== null ? isStudyAnswerCorrect(currentCard, selectedAnswer) : null,
        };
    }, [studySession]);
    const searchStudySessionViewModel = useMemo(
        () => (studySessionViewModel?.source === "search" ? studySessionViewModel : null),
        [studySessionViewModel],
    );
    const favoritesStudySessionViewModel = useMemo(
        () => (studySessionViewModel?.source === "favorites" ? studySessionViewModel : null),
        [studySessionViewModel],
    );

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
                goalSummary:
                    dailyGoalEnabled || reviewReminderEnabled
                        ? {
                              showGoal: dailyGoalSettings.enabled,
                              progress: dailyGoalProgress,
                              streak: reviewStreakState,
                              reminderLabel: reviewReminderEnabled ? nextReminderLabel : null,
                          }
                        : undefined,
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
                studyEnabled: studyEntryEnabled && studySessionEnabled,
                studyAvailable,
                studySession: favoritesStudySessionViewModel,
                onStartStudyMode: (word: WordResult) => {
                    handleStartStudySession("favorites", word);
                },
                onRetryStudyMode: handleRetryStudySession,
                onRegenerateStudyMode: handleRegenerateStudySession,
                onCloseStudyMode: handleCloseStudySession,
                onSelectStudyChoice: handleSelectStudyChoice,
                onAdvanceStudyCard: handleAdvanceStudyCard,
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
                studyEnabled: studyEntryEnabled && studySessionEnabled,
                studyAvailable,
                studySession: searchStudySessionViewModel,
                onStartStudyMode: (word: WordResult) => {
                    handleStartStudySession("search", word);
                },
                onRetryStudyMode: handleRetryStudySession,
                onRegenerateStudyMode: handleRegenerateStudySession,
                onCloseStudyMode: handleCloseStudySession,
                onSelectStudyChoice: handleSelectStudyChoice,
                onAdvanceStudyCard: handleAdvanceStudyCard,
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
                dailyGoalSettings,
                dailyGoalProgress,
                reviewStreak: reviewStreakState,
                reviewReminderSettings,
                nextReminderLabel,
                onToggleDailyGoal: handleToggleDailyGoal,
                onSelectDailyGoalTarget: handleSelectDailyGoalTarget,
                onToggleReviewReminder: handleToggleReviewReminder,
                onSelectReviewReminderTime: handleSelectReviewReminderTime,
                onToggleReviewReminderWeekday: handleToggleReviewReminderWeekday,
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
            dailyGoalEnabled,
            dailyGoalProgress,
            dailyGoalSettings,
            dueReviewCount,
            handleApplyReviewOutcome,
            handleAssignCurrentWordToCollection,
            handleAdvanceStudyCard,
            handleCloseReviewSession,
            handleCloseStudySession,
            handleCreateCollectionForCurrentWord,
            handlePlayWordAudioAsync,
            handleSelectDailyGoalTarget,
            handleSelectReviewReminderTime,
            handleToggleDailyGoal,
            handleToggleReviewReminder,
            handleToggleReviewReminderWeekday,
            handleRegenerateStudySession,
            handleRetryStudySession,
            handleStartReviewSession,
            handleStartStudySession,
            handleSelectStudyChoice,
            isCurrentFavorite,
            favoritesStudySessionViewModel,
            playPronunciationAsync,
            reviewDashboardEnabled,
            reviewReminderEnabled,
            reviewReminderSettings,
            reviewSessionEnabled,
            reviewSessionViewModel,
            reviewStreakState,
            searchStudySessionViewModel,
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
            studyAvailable,
            studyEntryEnabled,
            studySessionEnabled,
            nextReminderLabel,
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
