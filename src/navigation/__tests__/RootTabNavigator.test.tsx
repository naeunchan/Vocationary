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
        favorites: [],
        onToggleFavorite: noop,
        onUpdateFavoriteStatus: jest.fn(),
        onRemoveFavorite: jest.fn(),
        searchTerm: "apple",
        onChangeSearchTerm: noop,
        onSubmitSearch: noop,
        loading: false,
        error: null,
        result: null,
        examplesVisible: false,
        onToggleExamples: noop,
        isCurrentFavorite: false,
        onPlayPronunciation: noop,
        pronunciationAvailable: false,
        mode: "en-en",
        onModeChange: noop,
        themeMode: "light",
        onThemeModeChange: noop,
        fontScale: 1,
        onFontScaleChange: noop,
        recentSearches: [],
        onSelectRecentSearch: noop,
        onClearRecentSearches: noop,
        userName: "Alex",
        onLogout: noop,
        canLogout: true,
        isGuest: false,
        onRequestLogin: noop,
        onRequestSignUp: noop,
        onPlayWordAudio: noop,
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
                favorites: props.favorites,
                mode: props.mode,
                userName: props.userName,
                onPlayWordAudio: props.onPlayWordAudio,
                pronunciationAvailable: props.pronunciationAvailable,
            }),
        );

        expect(mockSearchScreen).toHaveBeenCalledWith(
            expect.objectContaining({
                searchTerm: props.searchTerm,
                onChangeSearchTerm: props.onChangeSearchTerm,
                onSubmit: props.onSubmitSearch,
                loading: props.loading,
                error: props.error,
                result: props.result,
                examplesVisible: props.examplesVisible,
                onToggleExamples: props.onToggleExamples,
                mode: props.mode,
                recentSearches: props.recentSearches,
                onSelectRecentSearch: props.onSelectRecentSearch,
                onClearRecentSearches: props.onClearRecentSearches,
                pronunciationAvailable: props.pronunciationAvailable,
            }),
        );
    });

    it("passes favorites props to FavoritesScreen and SettingsNavigator", () => {
        const props = buildProps();
        render(<RootTabNavigator {...props} />);

        expect(mockFavoritesScreen).toHaveBeenCalledWith(
            expect.objectContaining({
                favorites: props.favorites,
                onUpdateStatus: props.onUpdateFavoriteStatus,
                onRemoveFavorite: props.onRemoveFavorite,
                onPlayAudio: props.onPlayWordAudio,
                pronunciationAvailable: props.pronunciationAvailable,
            }),
        );

        expect(mockSettingsNavigator).toHaveBeenCalledWith(
            expect.objectContaining({
                onLogout: props.onLogout,
                canLogout: props.canLogout,
                isGuest: props.isGuest,
                onRequestLogin: props.onRequestLogin,
                onRequestSignUp: props.onRequestSignUp,
                appVersion: props.appVersion,
                profileDisplayName: props.profileDisplayName,
                profileUsername: props.profileUsername,
                onUpdateProfile: props.onUpdateProfile,
                onCheckDisplayName: props.onCheckDisplayName,
                onUpdatePassword: props.onUpdatePassword,
                onDeleteAccount: props.onDeleteAccount,
                themeMode: props.themeMode,
                onThemeModeChange: props.onThemeModeChange,
                fontScale: props.fontScale,
                onFontScaleChange: props.onFontScaleChange,
            }),
        );
    });
});
