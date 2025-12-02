import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { SearchScreen } from "@/screens/Search/SearchScreen";
import { AppAppearanceProvider } from "@/theme/AppearanceContext";

jest.mock("@expo/vector-icons/Ionicons", () => {
    const React = require("react");
    const { Text } = require("react-native");
    return (props: { name: string }) => <Text>{props.name}</Text>;
});

const wrapper: React.ComponentType<React.PropsWithChildren> = ({ children }) => (
    <AppAppearanceProvider
        mode="light"
        fontScale={1}
        onChangeMode={() => undefined}
        onChangeFontScale={() => undefined}
    >
        {children}
    </AppAppearanceProvider>
);

const baseProps = {
    searchTerm: "",
    onChangeSearchTerm: jest.fn(),
    onSubmit: jest.fn(),
    loading: false,
    error: null,
    result: null,
    examplesVisible: false,
    onToggleExamples: jest.fn(),
    onToggleFavorite: jest.fn(),
    isCurrentFavorite: false,
    onPlayPronunciation: jest.fn(),
    mode: "en-en" as const,
    onModeChange: jest.fn(),
    recentSearches: [],
    onSelectRecentSearch: jest.fn(),
    onClearRecentSearches: jest.fn(),
    onRetry: jest.fn(),
};

describe("SearchScreen", () => {
    const baseProps = {
        searchTerm: "apple",
        onChangeSearchTerm: jest.fn(),
        onSubmit: jest.fn(),
        loading: false,
        error: null,
        result: null,
        examplesVisible: false,
        onToggleExamples: jest.fn(),
        onToggleFavorite: jest.fn(),
        isCurrentFavorite: false,
        onPlayPronunciation: jest.fn(),
        pronunciationAvailable: false,
        mode: "en-en" as const,
        onModeChange: jest.fn(),
        recentSearches: [],
        onSelectRecentSearch: jest.fn(),
        onClearRecentSearches: jest.fn(),
    };

    const button = getByLabelText("영한사전");
    fireEvent.press(button);

    it("renders placeholder when no result and not loading", () => {
        const { getByText } = render(<SearchScreen {...baseProps} />);

        expect(getByText("검색 결과가 여기에 표시됩니다")).toBeTruthy();
        expect(mockSearchResults).not.toHaveBeenCalled();
        expect(getByText("AI 발음/예문 준비 중")).toBeTruthy();
    });

    it("renders SearchResults when result available", () => {
        const props = { ...baseProps, result: { word: "apple", phonetic: null, audioUrl: null, meanings: [] } };
        render(<SearchScreen {...props} />);

        expect(mockSearchResults).toHaveBeenCalledWith(
            expect.objectContaining({
                loading: false,
                error: null,
                result: props.result,
                isFavorite: props.isCurrentFavorite,
                onToggleFavorite: props.onToggleFavorite,
                onPlayPronunciation: props.onPlayPronunciation,
                pronunciationAvailable: props.pronunciationAvailable,
            }),
        );
    });

    it("calls onModeChange when tapping inactive mode button", () => {
        const props = { ...baseProps, mode: "en-ko" as const };
        const { getByText } = render(<SearchScreen {...props} />);

        fireEvent.press(getByText("영영사전"));
        expect(props.onModeChange).toHaveBeenCalledWith("en-en");
    });

    it("does not trigger disabled mode button", () => {
        const props = { ...baseProps, mode: "en-en" as const };
        const { getByText } = render(<SearchScreen {...props} />);

        fireEvent.press(getByText("영한사전 (준비중)"));
        expect(props.onModeChange).not.toHaveBeenCalledWith("en-ko");
    });

    it("renders recent searches section when history is available", () => {
        const props = {
            ...baseProps,
            recentSearches: [{ term: "apple", mode: "en-en" as const, searchedAt: "2024-01-01T00:00:00.000Z" }],
        };
        const { getByText, getByLabelText } = render(<SearchScreen {...props} />);

        expect(getByText("최근 검색")).toBeTruthy();
        fireEvent.press(getByText("전체 지우기"));
        expect(props.onClearRecentSearches).toHaveBeenCalled();

        fireEvent.press(getByLabelText("apple 검색어로 이동"));
        expect(props.onSelectRecentSearch).toHaveBeenCalledWith(props.recentSearches[0]);
    });
});
