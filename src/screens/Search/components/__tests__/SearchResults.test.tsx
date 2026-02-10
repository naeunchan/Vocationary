import { fireEvent, render } from "@testing-library/react-native";
import React from "react";

import type { AppError } from "@/errors/AppError";
import { SearchResults } from "@/screens/Search/components/SearchResults";
import { WordResult } from "@/services/dictionary/types";

const mockWordResultCard = jest.fn();

jest.mock("@/services/dictionary/components/WordResultCard", () => {
    const React = require("react");
    const { Text } = require("react-native");
    return {
        WordResultCard: (props: any) => {
            mockWordResultCard(props);
            return <Text testID="word-result-card">{props.result.word}</Text>;
        },
    };
});

const baseResult: WordResult = {
    word: "apple",
    phonetic: "/ˈæp.əl/",
    audioUrl: "https://example.com/audio.mp3",
    meanings: [
        {
            partOfSpeech: "noun",
            definitions: [{ definition: "Fruit" }],
        },
    ],
};

describe("SearchResults", () => {
    const defaultProps = {
        loading: false,
        error: null,
        result: baseResult,
        examplesVisible: false,
        onToggleExamples: jest.fn(),
        isFavorite: false,
        onToggleFavorite: jest.fn(),
        onPlayPronunciation: jest.fn(),
        pronunciationAvailable: false,
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("renders loading indicator", () => {
        const { getByTestId } = render(<SearchResults {...defaultProps} loading result={null} />);
        expect(getByTestId("search-results-loading")).toBeTruthy();
    });

    it("renders error text and retry button", () => {
        const mockRetry = jest.fn();
        const error: AppError = {
            kind: "NetworkError",
            message: "네트워크 오류",
            retryable: true,
        };
        const { getByText } = render(
            <SearchResults {...defaultProps} loading={false} error={error} result={null} onRetry={mockRetry} />,
        );
        expect(getByText("네트워크 오류")).toBeTruthy();
        fireEvent.press(getByText("다시 시도하기"));
        expect(mockRetry).toHaveBeenCalled();
    });

    it("renders null when no result", () => {
        const { toJSON } = render(<SearchResults {...defaultProps} loading={false} error={null} result={null} />);
        expect(toJSON()).toBeNull();
    });

    it("renders WordResultCard with provided props", () => {
        const props = { ...defaultProps, result: baseResult, isFavorite: true, examplesVisible: true };
        const { getByTestId } = render(<SearchResults {...props} />);

        expect(getByTestId("word-result-card").props.children).toBe("apple");
        expect(mockWordResultCard).toHaveBeenCalledWith(
            expect.objectContaining({
                result: baseResult,
                isFavorite: true,
                examplesVisible: true,
                pronunciationAvailable: false,
            }),
        );
    });

    it("renders AI warning card without hiding result and supports retry", () => {
        const onRetryAiAssist = jest.fn();
        const aiAssistError: AppError = {
            kind: "NetworkError",
            message: "AI 연결이 원활하지 않아요. 잠시 후 다시 시도해주세요.",
            retryable: true,
        };

        const { getByText, getByTestId } = render(
            <SearchResults
                {...defaultProps}
                result={baseResult}
                aiAssistError={aiAssistError}
                onRetryAiAssist={onRetryAiAssist}
            />,
        );

        expect(getByTestId("word-result-card")).toBeTruthy();
        expect(getByTestId("search-results-ai-warning")).toBeTruthy();
        fireEvent.press(getByText("다시 시도하기"));
        expect(onRetryAiAssist).toHaveBeenCalled();
    });
});
