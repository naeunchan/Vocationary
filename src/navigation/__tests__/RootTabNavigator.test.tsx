import { render } from "@testing-library/react-native";
import React from "react";

import { RootTabNavigator } from "@/navigation/RootTabNavigator";
import { RootTabNavigatorProps } from "@/navigation/RootTabNavigator.types";

const mockHomeScreen = jest.fn(() => null);
const mockFavoritesScreen = jest.fn(() => null);
const mockSearchScreen = jest.fn(() => null);
const mockSettingsNavigator = jest.fn(() => null);

jest.mock("@expo/vector-icons", () => ({
    MaterialIcons: () => null,
}));

jest.mock("@/screens/Home/HomeScreen", () => ({
    HomeScreen: (props: any) => mockHomeScreen(props),
}));

jest.mock("@/screens/Favorites/FavoritesScreen", () => ({
    FavoritesScreen: (props: any) => mockFavoritesScreen(props),
}));

jest.mock("@/screens/Search/SearchScreen", () => ({
    SearchScreen: (props: any) => mockSearchScreen(props),
}));

jest.mock("@/screens/Settings/SettingsNavigator", () => ({
    SettingsNavigator: (props: any) => mockSettingsNavigator(props),
}));

jest.mock("@react-navigation/bottom-tabs", () => {
    const React = require("react");
    return {
        createBottomTabNavigator: () => {
            const Navigator = ({ children }: { children: React.ReactNode }) => <>{children}</>;
            const Screen = ({ children }: { children: React.ReactNode | ((props: any) => React.ReactNode) }) => (
                <>{typeof children === "function" ? children({}) : children}</>
            );
            return { Navigator, Screen };
        },
    };
});

const buildProps = (): RootTabNavigatorProps => {
    const noop = jest.fn();
    const asyncNoop = jest.fn((_arg?: any) => Promise.resolve());

    return {
        home: {
            favorites: [],
            onMoveToStatus: jest.fn(),
            userName: "Alex",
            onPlayWordAudio: noop,
            pronunciationAvailable: false,
            reviewEnabled: false,
            reviewSummary: {
                dueCount: 0,
                canStartReview: false,
            },
            reviewSession: null,
            onStartReviewSession: noop,
            onCloseReviewSession: noop,
            onApplyReviewOutcome: noop,
        },
        favorites: {
            favorites: [],
            onUpdateStatus: jest.fn(),
            onRemoveFavorite: jest.fn(),
            onPlayAudio: noop,
            pronunciationAvailable: false,
        },
        search: {
            searchTerm: "apple",
            hasSearched: false,
            onChangeSearchTerm: noop,
            onSubmit: noop,
            loading: false,
            error: null,
            result: null,
            examplesVisible: false,
            onToggleExamples: noop,
            onToggleFavorite: noop,
            isCurrentFavorite: false,
            onPlayPronunciation: noop,
            pronunciationAvailable: false,
            autocompleteSuggestions: [],
            autocompleteLoading: false,
            onSelectAutocomplete: noop,
            recentSearches: [],
            onSelectRecentSearch: noop,
            onClearRecentSearches: noop,
            onRetry: noop,
            onRetryAiAssist: noop,
            onRegenerateExamples: noop,
        },
        settings: {
            onLogout: noop,
            canLogout: true,
            isGuest: false,
            onRequestLogin: noop,
            onRequestSignUp: noop,
            appVersion: "1.0.0",
            profileDisplayName: "Alex",
            profileUsername: "alex",
            onUpdateProfile: asyncNoop,
            onCheckDisplayName: jest.fn(() => Promise.resolve("ok")),
            onUpdatePassword: asyncNoop,
            onDeleteAccount: asyncNoop,
            onExportBackup: asyncNoop,
            onImportBackup: asyncNoop,
            onShowOnboarding: noop,
            themeMode: "light",
            onThemeModeChange: noop,
            fontScale: 1,
            onFontScaleChange: noop,
            dailyGoalSettings: {
                enabled: false,
                targetCount: 10,
                updatedAt: null,
            },
            dailyGoalProgress: {
                completedCount: 0,
                targetCount: 10,
                remainingCount: 10,
                isComplete: false,
            },
            reviewStreak: {
                currentStreak: 0,
                longestStreak: 0,
                lastCompletedDate: null,
            },
            reviewReminderSettings: {
                enabled: false,
                hour: 20,
                minute: 0,
                weekdays: [1, 2, 3, 4, 5, 6, 0],
                updatedAt: null,
            },
            nextReminderLabel: null,
            onToggleDailyGoal: noop,
            onSelectDailyGoalTarget: noop,
            onToggleReviewReminder: noop,
            onSelectReviewReminderTime: noop,
            onToggleReviewReminderWeekday: noop,
        },
    };
};

describe("RootTabNavigator", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("renders Home and Search screens with expected props", () => {
        const props = buildProps();
        render(<RootTabNavigator {...props} />);

        expect(mockHomeScreen).toHaveBeenCalledWith(
            expect.objectContaining({
                favorites: props.home.favorites,
                userName: props.home.userName,
                onPlayWordAudio: props.home.onPlayWordAudio,
                pronunciationAvailable: props.home.pronunciationAvailable,
            }),
        );

        expect(mockSearchScreen).toHaveBeenCalledWith(
            expect.objectContaining({
                searchTerm: props.search.searchTerm,
                hasSearched: props.search.hasSearched,
                onChangeSearchTerm: props.search.onChangeSearchTerm,
                onSubmit: props.search.onSubmit,
                loading: props.search.loading,
                error: props.search.error,
                result: props.search.result,
                examplesVisible: props.search.examplesVisible,
                onToggleExamples: props.search.onToggleExamples,
                autocompleteSuggestions: props.search.autocompleteSuggestions,
                autocompleteLoading: props.search.autocompleteLoading,
                onSelectAutocomplete: props.search.onSelectAutocomplete,
                recentSearches: props.search.recentSearches,
                onSelectRecentSearch: props.search.onSelectRecentSearch,
                onClearRecentSearches: props.search.onClearRecentSearches,
                pronunciationAvailable: props.search.pronunciationAvailable,
            }),
        );
    });

    it("passes favorites props to FavoritesScreen and SettingsNavigator", () => {
        const props = buildProps();
        render(<RootTabNavigator {...props} />);

        expect(mockFavoritesScreen).toHaveBeenCalledWith(
            expect.objectContaining({
                favorites: props.favorites.favorites,
                onUpdateStatus: props.favorites.onUpdateStatus,
                onRemoveFavorite: props.favorites.onRemoveFavorite,
                onPlayAudio: props.favorites.onPlayAudio,
                pronunciationAvailable: props.favorites.pronunciationAvailable,
            }),
        );

        expect(mockSettingsNavigator).toHaveBeenCalledWith(
            expect.objectContaining({
                onLogout: props.settings.onLogout,
                canLogout: props.settings.canLogout,
                isGuest: props.settings.isGuest,
                onRequestLogin: props.settings.onRequestLogin,
                onRequestSignUp: props.settings.onRequestSignUp,
                appVersion: props.settings.appVersion,
                profileDisplayName: props.settings.profileDisplayName,
                profileUsername: props.settings.profileUsername,
                onUpdateProfile: props.settings.onUpdateProfile,
                onCheckDisplayName: props.settings.onCheckDisplayName,
                onUpdatePassword: props.settings.onUpdatePassword,
                onDeleteAccount: props.settings.onDeleteAccount,
                themeMode: props.settings.themeMode,
                onThemeModeChange: props.settings.onThemeModeChange,
                fontScale: props.settings.fontScale,
                onFontScaleChange: props.settings.onFontScaleChange,
            }),
        );
    });
});
