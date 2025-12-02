import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { FavoritesList } from "@/screens/Home/components/FavoritesList";
import { FavoriteWordEntry } from "@/services/favorites/types";

jest.mock("@expo/vector-icons", () => {
	const React = require("react");
	const { Text } = require("react-native");
	return {
		MaterialIcons: ({ name }: { name: string }) => <Text>{name}</Text>,
	};
});

const baseWord = {
	word: "apple",
	phonetic: "/ˈæp.əl/",
	audioUrl: "https://example.com/audio.mp3",
	meanings: [
		{
			partOfSpeech: "noun",
			definitions: [{ definition: "A sweet edible fruit" }],
		},
	],
};

const createFavoriteEntry = (overrides?: Partial<FavoriteWordEntry>): FavoriteWordEntry => ({
	word: {
		...baseWord,
		...(overrides?.word ?? {}),
	},
	status: "toMemorize",
	updatedAt: new Date().toISOString(),
	...(overrides ?? {}),
});

describe("FavoritesList", () => {
	it("renders favorite entries and triggers callbacks", () => {
		const onMoveToReview = jest.fn();
		const onPlayAudio = jest.fn();
		const entries = [
			createFavoriteEntry(),
			createFavoriteEntry({ word: { ...baseWord, word: "orange" } }),
		];

		const { getByText, getAllByLabelText } = render(
			<FavoritesList entries={entries} onMoveToReview={onMoveToReview} onPlayAudio={onPlayAudio} pronunciationAvailable />,
		);

		expect(getByText("apple")).toBeTruthy();
		expect(getByText("orange")).toBeTruthy();

		const audioButtons = getAllByLabelText(/발음 듣기/);
		fireEvent.press(audioButtons[0]);
		expect(onPlayAudio).toHaveBeenCalledWith(entries[0].word);

		const moveButtons = getAllByLabelText(/복습으로 이동/);
		fireEvent.press(moveButtons[1]);
		expect(onMoveToReview).toHaveBeenCalledWith("orange");
	});

	it("shows empty message when no entries provided", () => {
		const { getByText, queryByText } = render(
			<FavoritesList entries={[]} onMoveToReview={jest.fn()} onPlayAudio={jest.fn()} emptyMessage="커스텀 메시지" pronunciationAvailable={false} />,
		);

		expect(getByText("커스텀 메시지")).toBeTruthy();
		expect(queryByText("외울 단어장")).toBeTruthy();
	});
});
