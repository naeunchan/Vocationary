import React from "react";
import { render } from "@testing-library/react-native";
import { HomeScreen } from "@/screens/Home/HomeScreen";
import { FavoriteWordEntry } from "@/services/favorites/types";

const mockHomeHeader = jest.fn(() => null);
const mockSummaryCard = jest.fn(() => null);
const mockFavoritesList = jest.fn(() => null);

jest.mock("@/screens/Home/components/HomeHeader", () => ({
	HomeHeader: (props: any) => mockHomeHeader(props),
}));

jest.mock("@/screens/Home/components/SummaryCard", () => ({
	SummaryCard: (props: any) => mockSummaryCard(props),
}));

jest.mock("@/screens/Home/components/FavoritesList", () => ({
	FavoritesList: (props: any) => mockFavoritesList(props),
}));

const buildEntry = (status: FavoriteWordEntry["status"] = "toMemorize"): FavoriteWordEntry => ({
	word: {
		word: `word-${status}`,
		phonetic: null,
		audioUrl: null,
		meanings: [
			{
				partOfSpeech: "noun",
				definitions: [{ definition: "definition" }],
			},
		],
	},
	status,
	updatedAt: new Date().toISOString(),
});

describe("HomeScreen", () => {
	const baseProps = {
		favorites: [buildEntry("toMemorize"), buildEntry("review"), buildEntry("mastered")],
		mode: "en-en" as const,
		onMoveToStatus: jest.fn(),
		userName: "Alex",
		onPlayWordAudio: jest.fn(),
		pronunciationAvailable: false,
	};

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("renders header, summary, and filtered favorites list", () => {
		render(<HomeScreen {...baseProps} />);

		expect(mockHomeHeader).toHaveBeenCalledWith(expect.objectContaining({ userName: baseProps.userName }));
		expect(mockSummaryCard).toHaveBeenCalledWith(
			expect.objectContaining({
				userName: baseProps.userName,
				mode: baseProps.mode,
				counts: expect.objectContaining({ toMemorize: 1, review: 1, mastered: 1 }),
			}),
		);
		expect(mockFavoritesList).toHaveBeenCalledWith(
			expect.objectContaining({
				entries: [expect.objectContaining({ status: "toMemorize" })],
				onPlayAudio: baseProps.onPlayWordAudio,
				pronunciationAvailable: baseProps.pronunciationAvailable,
			}),
		);
	});

	it("forwards onMoveToStatus handler as review action", () => {
		render(<HomeScreen {...baseProps} />);

		const favoritesProps = mockFavoritesList.mock.calls[0][0];
		favoritesProps.onMoveToReview("orange");
		expect(baseProps.onMoveToStatus).toHaveBeenCalledWith("orange", "review");
	});
});
