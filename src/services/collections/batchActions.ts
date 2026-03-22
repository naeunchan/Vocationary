import { assignWordsToCollection, removeWordsFromCollections } from "@/services/collections/collections";
import type {
    CollectionBatchAction,
    CollectionBatchActionInput,
    CollectionBatchActionResult,
} from "@/services/collections/types";

function normalizeWordKey(word: string): string {
    return word.trim().toLowerCase();
}

function normalizeWordKeys(wordKeys: string[]): string[] {
    return Array.from(new Set(wordKeys.map(normalizeWordKey).filter(Boolean)));
}

export function applyCollectionBatchAction(
    input: CollectionBatchActionInput,
    action: CollectionBatchAction,
): CollectionBatchActionResult {
    const normalizedWordKeys = normalizeWordKeys(action.wordKeys);

    if (action.type === "setStatus") {
        return {
            favorites: input.favorites.map((entry) =>
                normalizedWordKeys.includes(normalizeWordKey(entry.word.word))
                    ? { ...entry, status: action.status, updatedAt: action.updatedAt ?? new Date().toISOString() }
                    : entry,
            ),
            collections: input.collections,
        };
    }

    if (action.type === "removeFavorites") {
        return {
            favorites: input.favorites.filter(
                (entry) => !normalizedWordKeys.includes(normalizeWordKey(entry.word.word)),
            ),
            collections: removeWordsFromCollections(input.collections, normalizedWordKeys),
        };
    }

    if (action.type === "addToCollection") {
        return {
            favorites: input.favorites,
            collections: assignWordsToCollection(
                input.collections,
                action.collectionId,
                normalizedWordKeys,
                action.updatedAt,
            ),
        };
    }

    return {
        favorites: input.favorites,
        collections: removeWordsFromCollections(input.collections, normalizedWordKeys, action.updatedAt),
    };
}
