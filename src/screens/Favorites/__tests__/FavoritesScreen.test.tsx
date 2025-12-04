import { fireEvent, render } from "@testing-library/react-native";
import React from "react";

import { FavoritesScreen } from "@/screens/Favorites/FavoritesScreen";
import type { FavoriteWordEntry } from "@/services/favorites/types";
import { AppAppearanceProvider } from "@/theme/AppearanceContext";

const mockFlashcard = jest.fn();

jest.mock("@/screens/Favorites/components/FavoritesFlashcard", () => {
    const React = require("react");
    const { Text } = require("react-native");
    return {
        FavoritesFlashcard: (props: any) => {
            mockFlashcard(props);
            return <Text testID="favorites-flashcard">{props.entries.length}</Text>;
        },
    };
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

const createEntry = (word: string, status: FavoriteWordEntry["status"]): FavoriteWordEntry => ({
    word: {
        word,
        phonetic: null,
        audioUrl: null,
        meanings: [],
    },
    status,
    updatedAt: new Date().toISOString(),
});

describe("FavoritesScreen", () => {
    const props = {
        favorites: [createEntry("alpha", "toMemorize"), createEntry("beta", "review")],
        onUpdateStatus: jest.fn(),
        onRemoveFavorite: jest.fn(),
        onPlayAudio: jest.fn(),
        pronunciationAvailable: false,
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("renders toMemorize entries by default", () => {
        const { getByTestId } = render(<FavoritesScreen {...props} />, { wrapper });

        expect(getByTestId("favorites-flashcard").props.children).toBe(1);
        expect(mockFlashcard).toHaveBeenLastCalledWith(
            expect.objectContaining({
                entries: [expect.objectContaining({ word: expect.objectContaining({ word: "alpha" }) })],
            }),
        );
    });

    it("switches segments and shows review entries", () => {
        const { getByText, getByTestId } = render(<FavoritesScreen {...props} />, { wrapper });

        fireEvent.press(getByText("복습 단어장"));
        expect(getByTestId("favorites-flashcard").props.children).toBe(1);
        expect(mockFlashcard).toHaveBeenLastCalledWith(
            expect.objectContaining({
                entries: [expect.objectContaining({ word: expect.objectContaining({ word: "beta" }) })],
            }),
        );
    });
});
