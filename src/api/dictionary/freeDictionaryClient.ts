import { createAppError } from "@/errors/AppError";
import { captureAppError } from "@/logging/logger";
import { DictionaryMode } from "@/services/dictionary/types";
import { DefinitionEntry, MeaningEntry, WordResult } from "@/services/dictionary/types/WordResult";

const MAX_MEANINGS = 2;
const MAX_DEFINITIONS = 2;
const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour

type CacheEntry = {
    expiresAt: number;
    value: WordResult;
};

const dictionaryCache = new Map<string, CacheEntry>();

type FreeDictionaryDefinition = {
    definition?: string;
    example?: string;
};

type FreeDictionaryMeaning = {
    partOfSpeech?: string;
    definitions?: FreeDictionaryDefinition[];
};

type FreeDictionaryPhonetic = {
    text?: string;
    audio?: string;
};

type FreeDictionaryEntry = {
    word?: string;
    phonetics?: FreeDictionaryPhonetic[];
    meanings?: FreeDictionaryMeaning[];
};

type FreeDictionaryResponse = FreeDictionaryEntry[];

function buildCacheKey(word: string, mode: DictionaryMode): string {
    return `${mode}:${word.toLowerCase()}`;
}

function pickPhonetic(entry: FreeDictionaryEntry): { phonetic?: string; audioUrl?: string } {
    const phonetics = Array.isArray(entry.phonetics) ? entry.phonetics : [];

    for (const item of phonetics) {
        if (item && typeof item.text === "string" && item.text.trim()) {
            return {
                phonetic: item.text.trim(),
                audioUrl: typeof item.audio === "string" && item.audio.trim() ? item.audio.trim() : undefined,
            };
        }
    }

    if (phonetics.length > 0) {
        const fallback = phonetics[0];
        return {
            phonetic: typeof fallback?.text === "string" ? fallback.text?.trim() || undefined : undefined,
            audioUrl: typeof fallback?.audio === "string" ? fallback.audio?.trim() || undefined : undefined,
        };
    }

    return {};
}

function sanitizeDefinition(
    definition: FreeDictionaryDefinition | undefined,
    shouldTranslate: boolean,
): DefinitionEntry | null {
    const text = typeof definition?.definition === "string" ? definition.definition.trim() : "";
    if (!text) {
        return null;
    }

    return {
        definition: text,
        originalDefinition: text,
        pendingTranslation: shouldTranslate,
        pendingExample: true,
    };
}

function sanitizeMeaning(meaning: FreeDictionaryMeaning | undefined, shouldTranslate: boolean): MeaningEntry | null {
    if (!meaning) {
        return null;
    }

    const definitions = Array.isArray(meaning.definitions) ? meaning.definitions.slice(0, MAX_DEFINITIONS) : [];
    const sanitized = definitions
        .map((definition) => sanitizeDefinition(definition, shouldTranslate))
        .filter((entry): entry is DefinitionEntry => entry !== null);

    if (sanitized.length === 0) {
        return null;
    }

    return {
        partOfSpeech: typeof meaning.partOfSpeech === "string" ? meaning.partOfSpeech : undefined,
        definitions: sanitized,
    };
}

function createWordResult(entry: FreeDictionaryEntry, shouldTranslate: boolean): WordResult | null {
    const word = typeof entry.word === "string" ? entry.word.trim() : "";
    const { phonetic, audioUrl } = pickPhonetic(entry);

    const meanings = Array.isArray(entry.meanings) ? entry.meanings.slice(0, MAX_MEANINGS) : [];
    const sanitizedMeanings = meanings
        .map((meaning) => sanitizeMeaning(meaning, shouldTranslate))
        .filter((meaning): meaning is MeaningEntry => meaning !== null);

    if (!word || sanitizedMeanings.length === 0) {
        return null;
    }

    return {
        word,
        phonetic: phonetic || undefined,
        audioUrl: audioUrl || undefined,
        meanings: sanitizedMeanings,
    };
}

function cloneWordResult(result: WordResult): WordResult {
    return {
        ...result,
        meanings: result.meanings.map((meaning) => ({
            ...meaning,
            definitions: meaning.definitions.map((definition) => ({ ...definition })),
        })),
    };
}

async function fetchFromSource(word: string): Promise<FreeDictionaryResponse> {
    const proxyEndpoint = process.env.EXPO_PUBLIC_DICTIONARY_PROXY_URL;
    const encodedWord = encodeURIComponent(word);
    const requestUrl = proxyEndpoint
        ? `${proxyEndpoint}?word=${encodedWord}`
        : `https://api.dictionaryapi.dev/api/v2/entries/en/${encodedWord}`;

    let response: Response;
    try {
        response = await fetch(requestUrl, {
            headers: {
                Accept: "application/json",
                "Cache-Control": "no-cache",
            },
        });
    } catch (error) {
        const appError = createAppError("NetworkError", "인터넷 연결을 확인한 뒤 다시 시도해주세요.", {
            cause: error,
            code: "DICTIONARY_FETCH_FAILED",
            retryable: true,
        });
        captureAppError(appError, { requestUrl });
        throw appError;
    }

    if (!response.ok) {
        const appError = createAppError("ServerError", "사전 데이터를 불러올 수 없어요.", {
            code: `HTTP_${response.status}`,
            retryable: response.status >= 500,
        });
        captureAppError(appError, { status: response.status, requestUrl });
        throw appError;
    }

    return (await response.json()) as FreeDictionaryResponse;
}

export async function fetchDictionaryEntry(word: string, mode: DictionaryMode): Promise<WordResult> {
    const normalized = word.trim().toLowerCase();
    const cacheKey = buildCacheKey(normalized, mode);
    const now = Date.now();

    const cached = dictionaryCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
        return cloneWordResult(cached.value);
    }

    const rawResponse = await fetchFromSource(normalized);
    if (!Array.isArray(rawResponse) || rawResponse.length === 0) {
        throw createAppError("ValidationError", "사전 정보를 찾을 수 없어요.", {
            code: "DICTIONARY_EMPTY",
        });
    }

    const shouldTranslate = mode === "en-ko";

    for (const entry of rawResponse) {
        const result = createWordResult(entry, shouldTranslate);
        if (result) {
            dictionaryCache.set(cacheKey, { value: result, expiresAt: now + CACHE_TTL_MS });
            return cloneWordResult(result);
        }
    }

    throw createAppError("ValidationError", "사전 정보를 찾을 수 없어요.", {
        code: "DICTIONARY_EMPTY",
    });
}
