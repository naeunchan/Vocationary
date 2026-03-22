import type { FavoriteWordEntry } from "@/services/favorites/types";

function cloneFavoriteEntry(entry: FavoriteWordEntry): FavoriteWordEntry {
    return {
        ...entry,
        word: {
            ...entry.word,
            meanings: entry.word.meanings.map((meaning) => ({
                ...meaning,
                definitions: meaning.definitions.map((definition) => ({ ...definition })),
            })),
        },
    };
}

function isFavoriteWordEntry(value: unknown): value is FavoriteWordEntry {
    if (!value || typeof value !== "object") {
        return false;
    }

    const candidate = value as Partial<FavoriteWordEntry>;
    return Boolean(
        candidate.word &&
        typeof candidate.word === "object" &&
        typeof candidate.word.word === "string" &&
        typeof candidate.status === "string" &&
        typeof candidate.updatedAt === "string",
    );
}

export function parseGuestFavoriteEntries(raw: string | null): FavoriteWordEntry[] {
    if (!raw) {
        return [];
    }

    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
            return [];
        }
        return parsed.filter(isFavoriteWordEntry).map(cloneFavoriteEntry);
    } catch {
        return [];
    }
}

export function mergeFavoriteEntries(base: FavoriteWordEntry[], incoming: FavoriteWordEntry[]): FavoriteWordEntry[] {
    const byWord = new Map<string, FavoriteWordEntry>();
    const pickLatest = (current: FavoriteWordEntry, next: FavoriteWordEntry) => {
        const currentTime = new Date(current.updatedAt).getTime();
        const nextTime = new Date(next.updatedAt).getTime();
        return nextTime >= currentTime ? next : current;
    };

    base.forEach((entry) => {
        byWord.set(entry.word.word, cloneFavoriteEntry(entry));
    });
    incoming.forEach((entry) => {
        const existing = byWord.get(entry.word.word);
        if (!existing) {
            byWord.set(entry.word.word, cloneFavoriteEntry(entry));
            return;
        }
        byWord.set(entry.word.word, pickLatest(existing, entry));
    });

    return Array.from(byWord.values()).sort((a, b) => {
        const aTime = new Date(a.updatedAt).getTime();
        const bTime = new Date(b.updatedAt).getTime();
        return bTime - aTime;
    });
}
