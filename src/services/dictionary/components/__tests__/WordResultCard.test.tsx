import { fireEvent, render } from "@testing-library/react-native";
import React from "react";

import { WordResultCard } from "@/services/dictionary/components/WordResultCard";
import type { WordResult } from "@/services/dictionary/types";
import { AppAppearanceProvider } from "@/theme/AppearanceContext";

jest.mock("@expo/vector-icons/Ionicons", () => {
    const React = require("react");
    const { Text } = require("react-native");
    return ({ name }: { name: string }) => <Text>{name}</Text>;
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

const baseResult: WordResult = {
    word: "apple",
    phonetic: "/ˈæp.əl/",
    audioUrl: "audio",
    meanings: [
        {
            partOfSpeech: "noun",
            definitions: [
                { definition: "Fruit", example: "I ate an apple.", translatedExample: "나는 사과를 먹었다." },
                { definition: "Company", pendingExample: true },
            ],
        },
    ],
};

describe("WordResultCard", () => {
    it("shows examples when visible", () => {
        const { getByText } = render(
            <WordResultCard
                result={baseResult}
                onToggleFavorite={jest.fn()}
                onPlayPronunciation={jest.fn()}
                pronunciationAvailable
                isFavorite={false}
                examplesVisible
                onToggleExamples={jest.fn()}
            />,
            { wrapper },
        );

        expect(getByText(/ex\) I ate an apple\./)).toBeTruthy();
        expect(getByText(/해석\) 나는 사과를 먹었다\./)).toBeTruthy();
    });

    it("shows fallback text when no examples available", () => {
        const result: WordResult = {
            ...baseResult,
            meanings: [
                {
                    partOfSpeech: "noun",
                    definitions: [{ definition: "Meaning" }],
                },
            ],
        };
        const { getByText } = render(
            <WordResultCard
                result={result}
                onToggleFavorite={jest.fn()}
                onPlayPronunciation={jest.fn()}
                pronunciationAvailable
                isFavorite={false}
                examplesVisible
                onToggleExamples={jest.fn()}
            />,
            { wrapper },
        );

        expect(getByText("예문을 찾지 못했어요.")).toBeTruthy();
    });

    it("prevents toggling examples while pending", () => {
        const onToggleExamples = jest.fn();
        const { getByText } = render(
            <WordResultCard
                result={baseResult}
                onToggleFavorite={jest.fn()}
                onPlayPronunciation={jest.fn()}
                pronunciationAvailable
                isFavorite={false}
                examplesVisible
                onToggleExamples={onToggleExamples}
            />,
            { wrapper },
        );

        fireEvent.press(getByText("예문을 불러오는 중..."));
        expect(onToggleExamples).not.toHaveBeenCalled();
    });

    it("allows toggling when examples are hidden even if pending", () => {
        const onToggleExamples = jest.fn();
        const { getByText } = render(
            <WordResultCard
                result={baseResult}
                onToggleFavorite={jest.fn()}
                onPlayPronunciation={jest.fn()}
                pronunciationAvailable
                isFavorite={false}
                examplesVisible={false}
                onToggleExamples={onToggleExamples}
            />,
            { wrapper },
        );

        fireEvent.press(getByText("예문 보기"));
        expect(onToggleExamples).toHaveBeenCalled();
    });

    it("calls onToggleFavorite when pressing star", () => {
        const onToggleFavorite = jest.fn();
        const { getByText } = render(
            <WordResultCard
                result={baseResult}
                onToggleFavorite={onToggleFavorite}
                onPlayPronunciation={jest.fn()}
                pronunciationAvailable
                isFavorite={false}
                examplesVisible={false}
                onToggleExamples={jest.fn()}
            />,
            { wrapper },
        );

        fireEvent.press(getByText("star-outline"));
        expect(onToggleFavorite).toHaveBeenCalledWith(baseResult);
    });
});
