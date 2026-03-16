import { createAppError } from "@/errors/AppError";
import { captureAppError } from "@/logging/logger";

const CACHE_TTL_MS = 1000 * 60 * 10; // 10 minutes

type CacheEntry = {
    expiresAt: number;
    value: string[];
};

type DatamuseSuggestion = {
    word?: string;
};

const suggestionCache = new Map<string, CacheEntry>();

function buildCacheKey(query: string, limit: number) {
    return `${query.toLowerCase()}::${limit}`;
}

function sanitizeSuggestion(word: unknown, normalizedQuery: string) {
    if (typeof word !== "string") {
        return null;
    }

    const trimmed = word.trim();
    if (!trimmed) {
        return null;
    }

    const normalizedWord = trimmed.toLowerCase();
    if (normalizedWord === normalizedQuery) {
        return null;
    }

    return normalizedWord.startsWith(normalizedQuery) ? trimmed : null;
}

async function fetchFromSource(query: string, limit: number): Promise<DatamuseSuggestion[]> {
    const requestUrl = `https://api.datamuse.com/sug?s=${encodeURIComponent(query)}&max=${limit}`;

    let response: Response;
    try {
        response = await fetch(requestUrl, {
            headers: {
                Accept: "application/json",
                "Cache-Control": "no-cache",
            },
        });
    } catch (error) {
        const appError = createAppError("NetworkError", "추천 검색어를 불러오지 못했어요.", {
            cause: error,
            code: "SUGGESTIONS_FETCH_FAILED",
            retryable: true,
        });
        captureAppError(appError, { requestUrl });
        throw appError;
    }

    if (!response.ok) {
        const appError = createAppError("ServerError", "추천 검색어를 불러오지 못했어요.", {
            code: `SUGGESTIONS_HTTP_${response.status}`,
            retryable: response.status >= 500,
        });
        captureAppError(appError, { requestUrl, status: response.status });
        throw appError;
    }

    return (await response.json()) as DatamuseSuggestion[];
}

export async function fetchWordSuggestions(query: string, limit = 6): Promise<string[]> {
    const normalizedQuery = query.trim().toLowerCase();
    if (normalizedQuery.length < 2) {
        return [];
    }
    if (!/^[a-z\s'-]+$/.test(normalizedQuery)) {
        return [];
    }

    const cacheKey = buildCacheKey(normalizedQuery, limit);
    const now = Date.now();
    const cached = suggestionCache.get(cacheKey);

    if (cached && cached.expiresAt > now) {
        return [...cached.value];
    }

    const response = await fetchFromSource(normalizedQuery, limit);
    const seen = new Set<string>();
    const suggestions = response
        .map((entry) => sanitizeSuggestion(entry?.word, normalizedQuery))
        .filter((value): value is string => value !== null)
        .filter((value) => {
            const normalizedValue = value.toLowerCase();
            if (seen.has(normalizedValue)) {
                return false;
            }
            seen.add(normalizedValue);
            return true;
        })
        .slice(0, limit);

    suggestionCache.set(cacheKey, {
        value: suggestions,
        expiresAt: now + CACHE_TTL_MS,
    });

    return [...suggestions];
}
