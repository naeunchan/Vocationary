import Constants from "expo-constants";
import { useCallback, useMemo, useRef, useState } from "react";
import { Alert } from "react-native";

import { normalizeAIProxyError } from "@/api/dictionary/aiProxyError";
import { getPronunciationAudio } from "@/api/dictionary/getPronunciationAudio";
import { OPENAI_FEATURE_ENABLED } from "@/config/openAI";
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
import { playRemoteAudio } from "@/utils/audio";

export function useAppScreen(): AppScreenHookResult {
    const [versionLabel] = useState(() => {
        const extra = Constants.expoConfig?.extra;
        return extra?.versionLabel ?? DEFAULT_VERSION_LABEL;
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

    const navigatorProps = useMemo<RootTabNavigatorProps>(
        () => ({
            favorites: sessionFlow.favorites,
            onToggleFavorite: sessionFlow.onToggleFavorite,
            onUpdateFavoriteStatus: sessionFlow.onUpdateFavoriteStatus,
            onRemoveFavorite: sessionFlow.onRemoveFavorite,
            searchTerm: searchFlow.searchTerm,
            hasSearched: searchFlow.hasSearched,
            onChangeSearchTerm: searchFlow.onChangeSearchTerm,
            onSubmitSearch: searchFlow.onSubmitSearch,
            loading: searchFlow.loading,
            error: searchFlow.error,
            aiAssistError: searchFlow.aiAssistError,
            result: searchFlow.result,
            examplesVisible: searchFlow.examplesVisible,
            onToggleExamples: searchFlow.onToggleExamples,
            isCurrentFavorite,
            onPlayPronunciation: () => {
                void playPronunciationAsync();
            },
            pronunciationAvailable: OPENAI_FEATURE_ENABLED,
            autocompleteSuggestions: searchFlow.autocompleteSuggestions,
            autocompleteLoading: searchFlow.autocompleteLoading,
            onSelectAutocomplete: searchFlow.onSelectAutocomplete,
            themeMode: appearanceFlow.themeMode,
            onThemeModeChange: appearanceFlow.onThemeModeChange,
            fontScale: appearanceFlow.fontScale,
            onFontScaleChange: appearanceFlow.onFontScaleChange,
            recentSearches: searchFlow.recentSearches,
            onSelectRecentSearch: searchFlow.onSelectRecentSearch,
            onClearRecentSearches: searchFlow.onClearRecentSearches,
            onRetrySearch: searchFlow.onRetrySearch,
            onRetryAiAssist: searchFlow.onRetryAiAssist,
            onRegenerateExamples: searchFlow.onRegenerateExamples,
            userName: sessionFlow.userName,
            onLogout: sessionFlow.onLogout,
            canLogout: sessionFlow.canLogout,
            isGuest: sessionFlow.isGuest,
            onRequestLogin: sessionFlow.onRequestLogin,
            onRequestSignUp: sessionFlow.onRequestSignUp,
            onPlayWordAudio: (word: WordResult) => {
                void handlePlayWordAudioAsync(word);
            },
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
        }),
        [
            appearanceFlow.fontScale,
            appearanceFlow.onFontScaleChange,
            appearanceFlow.onShowOnboarding,
            appearanceFlow.onThemeModeChange,
            appearanceFlow.themeMode,
            handlePlayWordAudioAsync,
            isCurrentFavorite,
            playPronunciationAsync,
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
            sessionFlow.favorites,
            sessionFlow.isGuest,
            sessionFlow.onCheckDisplayName,
            sessionFlow.onDeleteAccount,
            sessionFlow.onExportBackup,
            sessionFlow.onImportBackup,
            sessionFlow.onLogout,
            sessionFlow.onRemoveFavorite,
            sessionFlow.onRequestLogin,
            sessionFlow.onRequestSignUp,
            sessionFlow.onToggleFavorite,
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
