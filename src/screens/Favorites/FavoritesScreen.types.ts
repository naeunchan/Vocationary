import { FavoriteWordEntry, MemorizationStatus } from "@/services/favorites/types";

export type FavoritesScreenProps = {
	favorites: FavoriteWordEntry[];
	onUpdateStatus: (word: string, status: MemorizationStatus) => void;
	onRemoveFavorite: (word: string) => void;
	onPlayAudio: (word: FavoriteWordEntry["word"]) => void;
	pronunciationAvailable: boolean;
};
