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
	<AppAppearanceProvider mode="light" fontScale={1} onChangeMode={() => undefined} onChangeFontScale={() => undefined}>
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
	it("enables bilingual dictionary mode", () => {
		const onModeChange = jest.fn();
		const { getByLabelText } = render(<SearchScreen {...baseProps} onModeChange={onModeChange} />, {
			wrapper,
		});

		const button = getByLabelText("영한사전");
		fireEvent.press(button);

		expect(onModeChange).toHaveBeenCalledWith("en-ko");
	});
});
