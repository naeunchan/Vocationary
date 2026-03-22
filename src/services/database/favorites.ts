import {
    cloneFavoriteEntry,
    cloneFavorites,
    ensureStateLoaded,
    memoryState,
    persistState,
} from "@/services/database/state";
import type { FavoriteWordEntry } from "@/services/favorites/types";

export async function getFavoritesByUser(userId: number): Promise<FavoriteWordEntry[]> {
    await ensureStateLoaded();
    return cloneFavorites(memoryState.favoritesByUser[userId] ?? []);
}

export async function upsertFavoriteForUser(userId: number, entry: FavoriteWordEntry) {
    await ensureStateLoaded();
    const list = memoryState.favoritesByUser[userId] ?? [];
    const targetWord = entry.word.word;
    const next = list.filter((item) => item.word.word !== targetWord);
    next.unshift(cloneFavoriteEntry(entry));
    memoryState.favoritesByUser[userId] = next;
    await persistState();
}

export async function removeFavoriteForUser(userId: number, word: string) {
    await ensureStateLoaded();
    const list = memoryState.favoritesByUser[userId] ?? [];
    memoryState.favoritesByUser[userId] = list.filter((item) => item.word.word !== word);
    await persistState();
}
