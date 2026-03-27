import type { CollectionMembershipMap, CollectionRecord } from "@/services/collections/types";
import { FavoriteWordEntry, MemorizationStatus } from "@/services/favorites/types";

export type FavoritesScreenProps = {
    favorites: FavoriteWordEntry[];
    onUpdateStatus: (word: string, status: MemorizationStatus) => void;
    onRemoveFavorite: (word: string) => void;
    onPlayAudio: (word: FavoriteWordEntry["word"]) => void;
    pronunciationAvailable: boolean;
    collectionsEnabled: boolean;
    collections: CollectionRecord[];
    collectionMemberships: CollectionMembershipMap;
    onCreateCollection: (name: string) => Promise<string | null>;
    onRenameCollection: (collectionId: string, name: string) => Promise<void>;
    onDeleteCollection: (collectionId: string) => Promise<void>;
    onAssignWordToCollection: (word: string, collectionId: string | null) => Promise<void>;
};
