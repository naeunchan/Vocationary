import { fireEvent, render } from "@testing-library/react-native";
import React from "react";

import { ReviewSessionScreen } from "@/screens/Review/ReviewSessionScreen";

const activeSession = {
    status: "active" as const,
    currentIndex: 0,
    totalCount: 2,
    completedCount: 0,
    correctCount: 0,
    incorrectCount: 0,
    pending: false,
    currentItem: {
        entry: {
            word: {
                word: "focus",
                phonetic: "/foʊ.kəs/",
                meanings: [
                    {
                        partOfSpeech: "noun",
                        definitions: [{ definition: "the center of interest" }],
                    },
                ],
            },
            status: "review" as const,
            updatedAt: "2026-03-27T00:00:00.000Z",
        },
        progress: null,
    },
};

describe("ReviewSessionScreen", () => {
    it("renders the active session and forwards review outcomes", () => {
        const onApplyOutcome = jest.fn();
        const { getByText } = render(
            <ReviewSessionScreen session={activeSession} onApplyOutcome={onApplyOutcome} onClose={jest.fn()} />,
        );

        fireEvent.press(getByText("외웠어요"));
        expect(onApplyOutcome).toHaveBeenCalledWith("easy");
        expect(getByText("focus")).toBeTruthy();
    });

    it("renders the completion state", () => {
        const { getByText } = render(
            <ReviewSessionScreen
                session={{
                    status: "complete",
                    totalCount: 3,
                    completedCount: 3,
                    correctCount: 2,
                    incorrectCount: 1,
                }}
                onApplyOutcome={jest.fn()}
                onClose={jest.fn()}
            />,
        );

        expect(getByText("복습을 마쳤어요")).toBeTruthy();
        expect(getByText("홈으로 돌아가기")).toBeTruthy();
    });
});
