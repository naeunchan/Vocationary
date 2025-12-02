import { DictionaryMode } from "@/services/dictionary/types";
import { FavoriteWordEntry, MemorizationStatus } from "@/services/favorites/types";

export type HomeScreenProps = {
	favorites: FavoriteWordEntry[];
	mode: DictionaryMode;
	onMoveToStatus: (word: string, status: MemorizationStatus) => void;
	userName: string;
	onPlayWordAudio: (word: FavoriteWordEntry["word"]) => void;
	pronunciationAvailable: boolean;
};
