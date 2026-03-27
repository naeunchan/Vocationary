import { fireEvent, render } from "@testing-library/react-native";
import React from "react";

import { StudyModeScreen } from "@/screens/StudyMode/StudyModeScreen";
import type { StudyModeViewModel } from "@/screens/StudyMode/StudyModeScreen.types";
import { AppAppearanceProvider } from "@/theme/AppearanceContext";

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

const activeViewModel: StudyModeViewModel = {
    source: "search",
    status: "active",
    word: {
        word: "apple",
        phonetic: null,
        audioUrl: null,
        meanings: [],
    },
    currentCard: {
        id: "card-1",
        type: "cloze",
        prompt: "Stay ____.",
        choices: [
            { id: "a", label: "apple", value: "apple" },
            { id: "b", label: "banana", value: "banana" },
        ],
        answer: "apple",
        explanation: "문맥상 apple이 맞아요.",
    },
    currentIndex: 0,
    totalCount: 3,
    completedCount: 1,
    correctCount: 1,
    selectedAnswer: null,
    answerSubmitted: false,
    isCurrentAnswerCorrect: null,
};

describe("StudyModeScreen", () => {
    it("renders an active study card and lets the user choose an answer", () => {
        const onSelectChoice = jest.fn();
        const onAdvance = jest.fn();
        const onRegenerate = jest.fn();

        const { getByText, getByLabelText } = render(
            <StudyModeScreen
                viewModel={activeViewModel}
                onClose={jest.fn()}
                onRetry={jest.fn()}
                onRegenerate={onRegenerate}
                onSelectChoice={onSelectChoice}
                onAdvance={onAdvance}
            />,
            { wrapper },
        );

        expect(getByText("AI 학습 모드")).toBeTruthy();
        expect(getByText("Stay ____.")).toBeTruthy();
        fireEvent.press(getByLabelText("apple 선택"));
        expect(onSelectChoice).toHaveBeenCalledWith("apple");
        fireEvent.press(getByText("새 카드 다시 생성"));
        expect(onRegenerate).toHaveBeenCalled();
    });

    it("renders retryable error state with a retry action", () => {
        const onRetry = jest.fn();
        const errorViewModel: StudyModeViewModel = {
            source: "favorites",
            status: "error",
            word: {
                word: "focus",
                phonetic: null,
                audioUrl: null,
                meanings: [],
            },
            error: {
                kind: "NetworkError",
                message: "학습 내용을 불러오지 못했어요.",
                retryable: true,
            },
            retryable: true,
        };

        const { getByText } = render(
            <StudyModeScreen
                viewModel={errorViewModel}
                onClose={jest.fn()}
                onRetry={onRetry}
                onRegenerate={jest.fn()}
                onSelectChoice={jest.fn()}
                onAdvance={jest.fn()}
            />,
            { wrapper },
        );

        expect(getByText("지금은 일부 기능만 이용 가능해요.")).toBeTruthy();
        fireEvent.press(getByText("다시 시도"));
        expect(onRetry).toHaveBeenCalled();
    });
});
