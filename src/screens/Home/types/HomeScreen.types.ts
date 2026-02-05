import { FavoriteWordEntry, MemorizationStatus } from "@/services/favorites/types";

export type HomeScreenProps = {
    favorites: FavoriteWordEntry[];
    onMoveToStatus: (word: string, status: MemorizationStatus) => void;
    userName: string;
    onPlayWordAudio: (word: FavoriteWordEntry["word"]) => void;
    pronunciationAvailable: boolean;
};
