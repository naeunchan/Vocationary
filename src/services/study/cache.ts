import type { StudyCardDeck } from "@/services/study/types";

type StudyCardCacheEntry = {
    expiresAt: number;
    deck: StudyCardDeck;
};

const STUDY_CARD_CACHE_TTL_MS = 1000 * 60 * 30;
const studyCardCache = new Map<string, StudyCardCacheEntry>();

function cloneStudyCardDeck(deck: StudyCardDeck): StudyCardDeck {
    return {
        ...deck,
        cards: deck.cards.map((card) => ({
            ...card,
            choices: [...card.choices],
        })),
    };
}

export function getCachedStudyCardDeck(cacheKey: string, now = Date.now()): StudyCardDeck | null {
    const cachedEntry = studyCardCache.get(cacheKey);
    if (!cachedEntry) {
        return null;
    }

    if (cachedEntry.expiresAt <= now) {
        studyCardCache.delete(cacheKey);
        return null;
    }

    return cloneStudyCardDeck(cachedEntry.deck);
}

export function setCachedStudyCardDeck(
    cacheKey: string,
    deck: StudyCardDeck,
    options: { ttlMs?: number; now?: number } = {},
): StudyCardDeck {
    const now = options.now ?? Date.now();
    const ttlMs = options.ttlMs ?? STUDY_CARD_CACHE_TTL_MS;
    const cachedDeck = cloneStudyCardDeck(deck);

    studyCardCache.set(cacheKey, {
        expiresAt: now + ttlMs,
        deck: cachedDeck,
    });

    return cloneStudyCardDeck(cachedDeck);
}

export function clearStudyCardDeckCache(): void {
    studyCardCache.clear();
}
