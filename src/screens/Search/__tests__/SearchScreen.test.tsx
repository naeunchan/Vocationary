import { fireEvent, render } from "@testing-library/react-native";
import React from "react";

import { SearchScreen } from "@/screens/Search/SearchScreen";
import { AppAppearanceProvider } from "@/theme/AppearanceContext";

const mockSearchResults = jest.fn();

jest.mock("@expo/vector-icons/Ionicons", () => {
    const React = require("react");
    const { Text } = require("react-native");
    return (props: { name: string }) => <Text>{props.name}</Text>;
});

jest.mock("@/screens/Search/components/SearchResults", () => ({
    SearchResults: (props: unknown) => {
        mockSearchResults(props);
        const React = require("react");
        const { Text } = require("react-native");
        return <Text testID="mock-search-results">SearchResults</Text>;
    },
}));

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
    searchTerm: "apple",
    hasSearched: false,
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
    autocompleteSuggestions: [],
    autocompleteLoading: false,
    onSelectAutocomplete: jest.fn(),
    recentSearches: [],
    onSelectRecentSearch: jest.fn(),
    onClearRecentSearches: jest.fn(),
    onRetry: jest.fn(),
    onRegenerateExamples: jest.fn(),
};

describe("SearchScreen", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("renders placeholder when no result and not loading", () => {
        const { getByText } = render(<SearchScreen {...baseProps} />, { wrapper });

        expect(getByText("검색 결과가 여기에 표시됩니다")).toBeTruthy();
        expect(mockSearchResults).not.toHaveBeenCalled();
        expect(getByText("AI 발음/예문 준비 중")).toBeTruthy();
    });

    it("renders empty-state copy after a search with no result", () => {
        const { getByText } = render(<SearchScreen {...baseProps} hasSearched />, { wrapper });

        expect(getByText("검색한 단어를 찾을 수 없어요.")).toBeTruthy();
        expect(getByText("철자를 다시 확인하거나 다른 단어로 검색해 보세요.")).toBeTruthy();
        expect(mockSearchResults).not.toHaveBeenCalled();
    });

    it("renders SearchResults when result available", () => {
        const props = {
            ...baseProps,
            result: { word: "apple", phonetic: null, audioUrl: null, meanings: [] },
        };
        render(<SearchScreen {...props} />, { wrapper });

        expect(mockSearchResults).toHaveBeenCalledWith(
            expect.objectContaining({
                loading: false,
                error: null,
                result: props.result,
                isFavorite: props.isCurrentFavorite,
                onToggleFavorite: props.onToggleFavorite,
                onPlayPronunciation: props.onPlayPronunciation,
                pronunciationAvailable: props.pronunciationAvailable,
                onRegenerateExamples: props.onRegenerateExamples,
            }),
        );
    });

    it("does not render dictionary mode selector", () => {
        const { queryByText } = render(<SearchScreen {...baseProps} />, { wrapper });
        expect(queryByText("사전 모드")).toBeNull();
    });

    it("renders recent searches section when history is available", () => {
        const props = {
            ...baseProps,
            recentSearches: [{ term: "apple", mode: "en-en" as const, searchedAt: "2024-01-01T00:00:00.000Z" }],
        };
        const { getByText, getByLabelText } = render(<SearchScreen {...props} />, { wrapper });

        expect(getByText("최근 검색")).toBeTruthy();
        fireEvent.press(getByText("전체 지우기"));
        expect(props.onClearRecentSearches).toHaveBeenCalled();

        fireEvent.press(getByLabelText("apple 검색어로 이동"));
        expect(props.onSelectRecentSearch).toHaveBeenCalledWith(props.recentSearches[0]);
    });

    it("renders autocomplete suggestions and hides recent searches while typing", () => {
        const props = {
            ...baseProps,
            autocompleteSuggestions: ["apple"],
            recentSearches: [{ term: "apple", mode: "en-en" as const, searchedAt: "2024-01-01T00:00:00.000Z" }],
        };
        const { getByText, queryByText } = render(<SearchScreen {...props} />, { wrapper });

        expect(getByText("추천 검색어")).toBeTruthy();
        expect(queryByText("최근 검색")).toBeNull();

        fireEvent.press(getByText("apple"));
        expect(props.onSelectAutocomplete).toHaveBeenCalledWith("apple");
    });
});
