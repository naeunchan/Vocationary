import type { FavoriteWordEntry, MemorizationStatus } from "@/services/favorites/types";

export type CollectionRecord = {
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
    wordKeys: string[];
};

export type CollectionMembershipMap = Record<string, string | null>;

export type CollectionBatchAction =
    | { type: "setStatus"; wordKeys: string[]; status: MemorizationStatus; updatedAt?: string }
    | { type: "removeFavorites"; wordKeys: string[] }
    | { type: "addToCollection"; wordKeys: string[]; collectionId: string; updatedAt?: string }
    | { type: "removeFromCollection"; wordKeys: string[]; updatedAt?: string };

export type CollectionBatchActionInput = {
    favorites: FavoriteWordEntry[];
    collections: CollectionRecord[];
};

export type CollectionBatchActionResult = CollectionBatchActionInput;
