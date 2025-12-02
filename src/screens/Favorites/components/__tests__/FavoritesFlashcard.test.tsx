import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { FavoritesFlashcard } from "@/screens/Favorites/components/FavoritesFlashcard";
import { FavoriteWordEntry } from "@/services/favorites/types";

jest.mock("@expo/vector-icons", () => {
	const React = require("react");
	const { Text } = require("react-native");
	return {
		MaterialIcons: ({ name }: { name: string }) => <Text>{name}</Text>,
	};
});

const buildEntry = (overrides?: Partial<FavoriteWordEntry>): FavoriteWordEntry => ({
	word: {
		word: "apple",
		phonetic: "/ˈæp.əl/",
		audioUrl: "https://example.com/audio.mp3",
		meanings: [
			{
				partOfSpeech: "noun",
				definitions: [{ definition: "사과" }],
			},
		],
	},
	status: "toMemorize",
	updatedAt: new Date().toISOString(),
	...(overrides ?? {}),
});

describe("FavoritesFlashcard", () => {
	const defaultProps = {
		status: "toMemorize" as const,
		onMoveToStatus: jest.fn(),
		onRemoveFavorite: jest.fn(),
		onPlayAudio: jest.fn(),
		pronunciationAvailable: true,
	};

	beforeEach(() => {
		jest.spyOn(Math, "random").mockReturnValue(0);
	});

	afterEach(() => {
		jest.restoreAllMocks();
		jest.clearAllMocks();
	});

	it("returns null when entries are empty", () => {
		const { toJSON } = render(<FavoritesFlashcard {...defaultProps} entries={[]} />);
		expect(toJSON()).toBeNull();
	});

	it("toggles meaning text", () => {
		const entries = [buildEntry()];
		const { getByLabelText, getByText, queryByText } = render(<FavoritesFlashcard {...defaultProps} entries={entries} />);

		expect(queryByText("사과")).toBeNull();
		fireEvent.press(getByLabelText("뜻 보기"));
		expect(getByText("사과")).toBeTruthy();
		fireEvent.press(getByLabelText("뜻 보기"));
		expect(queryByText("사과")).toBeNull();
	});

	it("plays audio when audio button pressed", () => {
		const entries = [buildEntry()];
		const onPlayAudio = jest.fn();

		const { getByLabelText } = render(<FavoritesFlashcard {...defaultProps} entries={entries} onPlayAudio={onPlayAudio} />);

		fireEvent.press(getByLabelText("apple 발음 듣기"));
		expect(onPlayAudio).toHaveBeenCalledWith(entries[0].word);
	});

	it("moves to next status when action pressed for toMemorize", () => {
		const entries = [buildEntry()];
		const onMoveToStatus = jest.fn();

		const { getByLabelText } = render(<FavoritesFlashcard {...defaultProps} entries={entries} onMoveToStatus={onMoveToStatus} />);

		fireEvent.press(getByLabelText("복습 단어장으로 이동"));
		expect(onMoveToStatus).toHaveBeenCalledWith("apple", "review");
	});

	it("removes favorite when mastered action pressed", () => {
		const entries = [buildEntry({ status: "mastered" })];
		const onRemoveFavorite = jest.fn();

		const { getByLabelText } = render(
			<FavoritesFlashcard {...defaultProps} status="mastered" entries={entries} onRemoveFavorite={onRemoveFavorite} />,
		);

		fireEvent.press(getByLabelText("단어 삭제"));
		expect(onRemoveFavorite).toHaveBeenCalledWith("apple");
	});
});
