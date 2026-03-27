import { fireEvent, render } from "@testing-library/react-native";
import React from "react";

import { FavoritesScreen } from "@/screens/Favorites/FavoritesScreen";
import type { FavoriteWordEntry } from "@/services/favorites/types";
import { AppAppearanceProvider } from "@/theme/AppearanceContext";

const mockFlashcard = jest.fn();

jest.mock("@/components/TextField", () => ({
    TextField: ({ value, onChangeText, placeholder }: any) => {
        const React = require("react");
        const { TextInput } = require("react-native");
        return <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} />;
    },
}));

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
        favorites: [
            createEntry("alpha", "toMemorize"),
            createEntry("beta", "review"),
            createEntry("gamma", "toMemorize"),
        ],
        onUpdateStatus: jest.fn(),
        onRemoveFavorite: jest.fn(),
        onPlayAudio: jest.fn(),
        pronunciationAvailable: false,
        collectionsEnabled: true,
        collections: [
            {
                id: "toeic",
                name: "TOEIC",
                createdAt: "2026-03-22T00:00:00.000Z",
                updatedAt: "2026-03-22T00:00:00.000Z",
                wordKeys: ["alpha"],
            },
            {
                id: "ielts",
                name: "IELTS",
                createdAt: "2026-03-22T00:00:00.000Z",
                updatedAt: "2026-03-22T00:00:00.000Z",
                wordKeys: ["gamma"],
            },
        ],
        collectionMemberships: {
            alpha: "toeic",
            gamma: "ielts",
        },
        onCreateCollection: jest.fn().mockResolvedValue("toeic"),
        onRenameCollection: jest.fn().mockResolvedValue(undefined),
        onDeleteCollection: jest.fn().mockResolvedValue(undefined),
        onAssignWordToCollection: jest.fn().mockResolvedValue(undefined),
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("renders toMemorize entries by default", () => {
        const { getByTestId } = render(<FavoritesScreen {...props} />, { wrapper });

        expect(getByTestId("favorites-flashcard").props.children).toBe(2);
        expect(mockFlashcard).toHaveBeenLastCalledWith(
            expect.objectContaining({
                entries: expect.arrayContaining([
                    expect.objectContaining({ word: expect.objectContaining({ word: "alpha" }) }),
                    expect.objectContaining({ word: expect.objectContaining({ word: "gamma" }) }),
                ]),
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

    it("filters visible flashcards by collection", () => {
        const { getAllByText, getByTestId } = render(<FavoritesScreen {...props} />, { wrapper });

        fireEvent.press(getAllByText("IELTS")[0]);
        expect(getByTestId("favorites-flashcard").props.children).toBe(1);
        expect(mockFlashcard).toHaveBeenLastCalledWith(
            expect.objectContaining({
                entries: [expect.objectContaining({ word: expect.objectContaining({ word: "gamma" }) })],
            }),
        );
    });
});
