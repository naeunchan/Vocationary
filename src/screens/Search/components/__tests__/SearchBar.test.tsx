import { fireEvent, render } from "@testing-library/react-native";
import React from "react";

import { SearchBar } from "@/screens/Search/components/SearchBar";

jest.mock("@expo/vector-icons/Ionicons", () => {
    const React = require("react");
    const { Text } = require("react-native");
    return (props: { name: string }) => <Text>{props.name}</Text>;
});

describe("SearchBar", () => {
    it("calls onChangeText when typing", () => {
        const onChangeText = jest.fn();
        const { getByPlaceholderText } = render(
            <SearchBar
                value=""
                onChangeText={onChangeText}
                onSubmit={jest.fn()}
                suggestions={[]}
                suggestionsLoading={false}
                onSelectSuggestion={jest.fn()}
            />,
        );

        fireEvent.changeText(getByPlaceholderText("검색할 영어 단어를 입력하세요"), "apple");
        expect(onChangeText).toHaveBeenCalledWith("apple");
    });

    it("clears value when clear button pressed", () => {
        const onChangeText = jest.fn();
        const { getByText } = render(
            <SearchBar
                value="hello"
                onChangeText={onChangeText}
                onSubmit={jest.fn()}
                suggestions={[]}
                suggestionsLoading={false}
                onSelectSuggestion={jest.fn()}
            />,
        );

        fireEvent.press(getByText("지우기"));
        expect(onChangeText).toHaveBeenCalledWith("");
    });

    it("submits when pressing submit button", () => {
        const onSubmit = jest.fn();
        const { getByText } = render(
            <SearchBar
                value="world"
                onChangeText={jest.fn()}
                onSubmit={onSubmit}
                suggestions={[]}
                suggestionsLoading={false}
                onSelectSuggestion={jest.fn()}
            />,
        );

        fireEvent.press(getByText("검색"));
        expect(onSubmit).toHaveBeenCalled();
    });

    it("renders suggestions and handles selection", () => {
        const onSelectSuggestion = jest.fn();
        const { getByText, getByTestId } = render(
            <SearchBar
                value="app"
                onChangeText={jest.fn()}
                onSubmit={jest.fn()}
                suggestions={["apple", "application"]}
                suggestionsLoading={false}
                onSelectSuggestion={onSelectSuggestion}
            />,
        );

        expect(getByTestId("search-autocomplete")).toBeTruthy();
        fireEvent.press(getByText("apple"));
        expect(onSelectSuggestion).toHaveBeenCalledWith("apple");
    });
});
