import { getPreferenceValue, setPreferenceValue } from "@/services/database";

export type PersistedExampleUpdate = {
    meaningIndex: number;
    definitionIndex: number;
    example?: string;
    translatedExample?: string;
    translatedDefinition?: string;
};

type PersistedCacheEntry<T> = {
    key: string;
    value: T;
    expiresAt: number;
    updatedAt: number;
};

type PersistedCachePayload<T> = {
    version: 1;
    entries: PersistedCacheEntry<T>[];
};

type PersistedCacheSnapshot<T> = {
    expiresAt: number;
    isFresh: boolean;
    value: T;
};

const PERSISTED_EXAMPLE_CACHE_KEY = "ai.cache.examples.v1";
const PERSISTED_TTS_CACHE_KEY = "ai.cache.tts.v1";
const MAX_PERSISTED_EXAMPLE_ENTRIES = 20;
const MAX_PERSISTED_TTS_ENTRIES = 20;

let loadedExampleEntries: PersistedCacheEntry<PersistedExampleUpdate[]>[] | null = null;
let loadedTtsEntries: PersistedCacheEntry<string>[] | null = null;
let exampleLoadPromise: Promise<PersistedCacheEntry<PersistedExampleUpdate[]>[]> | null = null;
let ttsLoadPromise: Promise<PersistedCacheEntry<string>[]> | null = null;

function normalizeExampleUpdates(value: unknown): PersistedExampleUpdate[] {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .map((item) => {
            const meaningIndex = Number(item?.meaningIndex);
            const definitionIndex = Number(item?.definitionIndex);
            if (!Number.isInteger(meaningIndex) || !Number.isInteger(definitionIndex)) {
                return null;
            }

            return {
                meaningIndex,
                definitionIndex,
                example: typeof item?.example === "string" ? item.example.trim() : undefined,
                translatedExample:
                    typeof item?.translatedExample === "string" ? item.translatedExample.trim() : undefined,
                translatedDefinition:
                    typeof item?.translatedDefinition === "string" ? item.translatedDefinition.trim() : undefined,
            };
        })
        .filter((entry): entry is PersistedExampleUpdate => Boolean(entry));
}

function normalizeEntries<T>(payload: unknown, normalizeValue: (value: unknown) => T | null): PersistedCacheEntry<T>[] {
    const rawEntries =
        payload && typeof payload === "object" ? ((payload as { entries?: unknown[] }).entries ?? []) : [];

    return rawEntries
        .map((entry) => {
            const key = typeof entry?.key === "string" ? entry.key : "";
            const expiresAt = Number(entry?.expiresAt);
            const updatedAt = Number(entry?.updatedAt);
            const value = normalizeValue(entry?.value);

            if (!key || !Number.isFinite(expiresAt) || !Number.isFinite(updatedAt) || value == null) {
                return null;
            }

            return {
                key,
                value,
                expiresAt,
                updatedAt,
            };
        })
        .filter((entry): entry is PersistedCacheEntry<T> => Boolean(entry));
}

function sortAndTrimEntries<T>(entries: PersistedCacheEntry<T>[], maxEntries: number): PersistedCacheEntry<T>[] {
    return [...entries].sort((left, right) => right.updatedAt - left.updatedAt).slice(0, maxEntries);
}

async function loadExampleEntries(): Promise<PersistedCacheEntry<PersistedExampleUpdate[]>[]> {
    if (loadedExampleEntries) {
        return loadedExampleEntries;
    }

    if (exampleLoadPromise) {
        return await exampleLoadPromise;
    }

    exampleLoadPromise = getPreferenceValue(PERSISTED_EXAMPLE_CACHE_KEY)
        .then((value) => {
            const parsed = typeof value === "string" ? JSON.parse(value) : null;
            loadedExampleEntries = normalizeEntries(parsed, (nextValue) => normalizeExampleUpdates(nextValue));
            return loadedExampleEntries;
        })
        .catch(() => {
            loadedExampleEntries = [];
            return loadedExampleEntries;
        })
        .finally(() => {
            exampleLoadPromise = null;
        });

    return await exampleLoadPromise;
}

async function loadTtsEntries(): Promise<PersistedCacheEntry<string>[]> {
    if (loadedTtsEntries) {
        return loadedTtsEntries;
    }

    if (ttsLoadPromise) {
        return await ttsLoadPromise;
    }

    ttsLoadPromise = getPreferenceValue(PERSISTED_TTS_CACHE_KEY)
        .then((value) => {
            const parsed = typeof value === "string" ? JSON.parse(value) : null;
            loadedTtsEntries = normalizeEntries(parsed, (nextValue) =>
                typeof nextValue === "string" && nextValue.trim() ? nextValue.trim() : null,
            );
            return loadedTtsEntries;
        })
        .catch(() => {
            loadedTtsEntries = [];
            return loadedTtsEntries;
        })
        .finally(() => {
            ttsLoadPromise = null;
        });

    return await ttsLoadPromise;
}

async function saveExampleEntries(entries: PersistedCacheEntry<PersistedExampleUpdate[]>[]): Promise<void> {
    const normalized = sortAndTrimEntries(entries, MAX_PERSISTED_EXAMPLE_ENTRIES);
    loadedExampleEntries = normalized;
    const payload: PersistedCachePayload<PersistedExampleUpdate[]> = {
        version: 1,
        entries: normalized,
    };
    await setPreferenceValue(PERSISTED_EXAMPLE_CACHE_KEY, JSON.stringify(payload));
}

async function saveTtsEntries(entries: PersistedCacheEntry<string>[]): Promise<void> {
    const normalized = sortAndTrimEntries(entries, MAX_PERSISTED_TTS_ENTRIES);
    loadedTtsEntries = normalized;
    const payload: PersistedCachePayload<string> = {
        version: 1,
        entries: normalized,
    };
    await setPreferenceValue(PERSISTED_TTS_CACHE_KEY, JSON.stringify(payload));
}

export async function getPersistedExampleUpdates(
    cacheKey: string,
    now = Date.now(),
): Promise<PersistedCacheSnapshot<PersistedExampleUpdate[]> | null> {
    const entries = await loadExampleEntries();
    const cached = entries.find((entry) => entry.key === cacheKey);
    if (!cached) {
        return null;
    }

    return {
        expiresAt: cached.expiresAt,
        isFresh: cached.expiresAt > now,
        value: normalizeExampleUpdates(cached.value),
    };
}

export async function setPersistedExampleUpdates(
    cacheKey: string,
    updates: PersistedExampleUpdate[],
    ttlMs: number,
    now = Date.now(),
): Promise<void> {
    const entries = await loadExampleEntries();
    const nextEntry: PersistedCacheEntry<PersistedExampleUpdate[]> = {
        key: cacheKey,
        value: normalizeExampleUpdates(updates),
        expiresAt: now + ttlMs,
        updatedAt: now,
    };
    const nextEntries = entries.filter((entry) => entry.key !== cacheKey);
    nextEntries.push(nextEntry);
    await saveExampleEntries(nextEntries);
}

export async function getPersistedPronunciationUri(
    cacheKey: string,
    now = Date.now(),
): Promise<PersistedCacheSnapshot<string> | null> {
    const entries = await loadTtsEntries();
    const cached = entries.find((entry) => entry.key === cacheKey);
    if (!cached) {
        return null;
    }

    return {
        expiresAt: cached.expiresAt,
        isFresh: cached.expiresAt > now,
        value: cached.value,
    };
}

export async function setPersistedPronunciationUri(
    cacheKey: string,
    uri: string,
    ttlMs: number,
    now = Date.now(),
): Promise<void> {
    const entries = await loadTtsEntries();
    const nextEntry: PersistedCacheEntry<string> = {
        key: cacheKey,
        value: uri,
        expiresAt: now + ttlMs,
        updatedAt: now,
    };
    const nextEntries = entries.filter((entry) => entry.key !== cacheKey);
    nextEntries.push(nextEntry);
    await saveTtsEntries(nextEntries);
}

export async function deletePersistedPronunciationUri(cacheKey: string): Promise<void> {
    const entries = await loadTtsEntries();
    await saveTtsEntries(entries.filter((entry) => entry.key !== cacheKey));
}
