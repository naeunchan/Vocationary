import { FavoriteWordEntry, MemorizationStatus } from "@/services/favorites/types";

export type FavoritesFlashcardProps = {
	entries: FavoriteWordEntry[];
	status: MemorizationStatus;
	onMoveToStatus: (word: string, status: MemorizationStatus) => void;
	onRemoveFavorite: (word: string) => void;
	onPlayAudio: (word: FavoriteWordEntry["word"]) => void;
	pronunciationAvailable: boolean;
};
