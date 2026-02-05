import { render } from "@testing-library/react-native";
import React from "react";

import { AppNavigator } from "@/components/AppNavigator/AppNavigator";
import { RootTabNavigatorProps } from "@/navigation/RootTabNavigator.types";

const mockRootTabNavigator = jest.fn();

jest.mock("@react-navigation/native", () => {
    const React = require("react");
    return {
        NavigationContainer: ({ children }: { children: React.ReactNode }) => <>{children}</>,
        DefaultTheme: { colors: { background: "#fff", card: "#fff", border: "#fff", primary: "#000", text: "#000" } },
        DarkTheme: { colors: { background: "#000", card: "#000", border: "#000", primary: "#fff", text: "#fff" } },
    };
});

jest.mock("@/navigation/RootTabNavigator", () => {
    const React = require("react");
    const { Text } = require("react-native");
    return {
        RootTabNavigator: (props: any) => {
            mockRootTabNavigator(props);
            return <Text testID="root-tab-navigator">RootTab</Text>;
        },
    };
});

const createProps = (): RootTabNavigatorProps => {
    const noop = jest.fn();
    const asyncNoop = jest.fn(() => Promise.resolve());
    return {
        favorites: [],
        onToggleFavorite: noop,
        onUpdateFavoriteStatus: jest.fn(),
        onRemoveFavorite: jest.fn(),
        searchTerm: "",
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

describe("AppNavigator", () => {
    it("renders RootTabNavigator inside NavigationContainer", () => {
        const props = createProps();
        const { getByTestId } = render(<AppNavigator {...props} />);

        expect(getByTestId("root-tab-navigator")).toBeTruthy();
        expect(mockRootTabNavigator).toHaveBeenCalledWith(expect.objectContaining({ favorites: [] }));
    });
});
