import {
    cloneSearchHistory,
    ensureStateLoaded,
    memoryState,
    normalizeSearchHistoryEntries,
    persistState,
    SEARCH_HISTORY_KEY,
} from "@/services/database/state";
import { SEARCH_HISTORY_LIMIT, type SearchHistoryEntry } from "@/services/searchHistory/types";

export function getSearchHistoryState() {
    const stored = memoryState.preferences[SEARCH_HISTORY_KEY];
    if (!stored) {
        return cloneSearchHistory(memoryState.searchHistory);
    }

    try {
        const parsed = JSON.parse(stored) as SearchHistoryEntry[];
        if (!Array.isArray(parsed)) {
            return [];
        }
        return normalizeSearchHistoryEntries(parsed).slice(0, SEARCH_HISTORY_LIMIT);
    } catch {
        return [];
    }
}

export function setSearchHistoryState(entries: SearchHistoryEntry[]) {
    const normalized = normalizeSearchHistoryEntries(entries).slice(0, SEARCH_HISTORY_LIMIT);
    memoryState.searchHistory = cloneSearchHistory(normalized);
    memoryState.preferences[SEARCH_HISTORY_KEY] = JSON.stringify(normalized);
}

export function clearSearchHistoryState() {
    memoryState.searchHistory = [];
    delete memoryState.preferences[SEARCH_HISTORY_KEY];
}

export async function getSearchHistoryEntries() {
    await ensureStateLoaded();
    return getSearchHistoryState();
}

export async function saveSearchHistoryEntries(entries: SearchHistoryEntry[]) {
    await ensureStateLoaded();
    setSearchHistoryState(entries);
    await persistState();
}

export async function clearSearchHistoryEntries() {
    await ensureStateLoaded();
    clearSearchHistoryState();
    await persistState();
}
