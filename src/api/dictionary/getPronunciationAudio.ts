import {
    deletePersistedPronunciationUri,
    getPersistedPronunciationUri,
    setPersistedPronunciationUri,
} from "@/api/dictionary/aiPersistentCache";
import {
    createAIHttpError,
    createAIInvalidPayloadError,
    createAIUnavailableError,
    normalizeAIProxyError,
} from "@/api/dictionary/aiProxyError";
import { OPENAI_FEATURE_ENABLED, OPENAI_PROXY_KEY, OPENAI_PROXY_URL } from "@/config/openAI";
import { createAppError } from "@/errors/AppError";

const TTS_MODEL = "gpt-4o-mini-tts";
const TTS_VOICE = "alloy";
const TTS_FORMAT = "mp3";
const AUDIO_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const AUDIO_CACHE: Map<string, string> = new Map();
const AUDIO_REQUESTS: Map<string, Promise<string>> = new Map();

type FileSystemModule = {
    cacheDirectory?: string | null;
    documentDirectory?: string | null;
    writeAsStringAsync?: (uri: string, contents: string, options?: { encoding?: string }) => Promise<void>;
    getInfoAsync?: (uri: string) => Promise<{ exists: boolean }>;
    EncodingType?: { Base64?: string };
};

function getFileSystemModule(): FileSystemModule | null {
    try {
        return require("expo-file-system") as FileSystemModule;
    } catch {
        return null;
    }
}

function normalizeWord(input: string) {
    return input.trim().toLowerCase();
}

function resolveDirectory(): string | null {
    const fileSystem = getFileSystemModule();
    const directory = fileSystem?.cacheDirectory ?? fileSystem?.documentDirectory;
    if (!directory) {
        return null;
    }
    return directory.endsWith("/") ? directory : `${directory}/`;
}

async function writeAudioToFile(base64Data: string, key: string) {
    const directory = resolveDirectory();
    const fileSystemWithWrite = getFileSystemModule();

    if (!directory || typeof fileSystemWithWrite?.writeAsStringAsync !== "function") {
        return null;
    }
    const safeKey = key.replace(/[^a-z0-9]/gi, "-");
    const fileUri = `${directory}tts-${safeKey}-${Date.now()}.${TTS_FORMAT}`;

    const encodingType = fileSystemWithWrite.EncodingType?.Base64 ?? "base64";

    await fileSystemWithWrite.writeAsStringAsync(fileUri, base64Data, {
        encoding: encodingType,
    });

    return fileUri;
}

async function resolveCachedAudioUri(normalized: string): Promise<string | null> {
    const cachedUri = AUDIO_CACHE.get(normalized);
    if (!cachedUri) {
        const persisted = await getPersistedPronunciationUri(normalized);
        if (!persisted || !persisted.isFresh) {
            if (persisted) {
                await deletePersistedPronunciationUri(normalized);
            }
            return null;
        }

        AUDIO_CACHE.set(normalized, persisted.value);
        return await validateCachedAudioUri(normalized, persisted.value);
    }

    return await validateCachedAudioUri(normalized, cachedUri);
}

async function validateCachedAudioUri(normalized: string, cachedUri: string): Promise<string | null> {
    if (!cachedUri) {
        return null;
    }

    if (cachedUri.startsWith("file://")) {
        const fileSystem = getFileSystemModule();
        if (!fileSystem?.getInfoAsync) {
            AUDIO_CACHE.delete(normalized);
            return null;
        }
        try {
            const info = await fileSystem.getInfoAsync(cachedUri);
            if (info.exists) {
                return cachedUri;
            }
        } catch {
            // Ignore and refresh cache below.
        }
        AUDIO_CACHE.delete(normalized);
        await deletePersistedPronunciationUri(normalized);
        return null;
    }

    return cachedUri;
}

function shouldPersistAudioUri(uri: string): boolean {
    return uri.startsWith("http://") || uri.startsWith("https://") || uri.startsWith("file://");
}

async function requestPronunciationAudio(normalized: string): Promise<string> {
    const endpointBase = OPENAI_PROXY_URL.replace(/\/+$/, "");
    const requestUrl = `${endpointBase}/dictionary/tts`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
        controller.abort();
    }, 8000);

    let response: Response;
    try {
        response = await fetch(requestUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(OPENAI_PROXY_KEY ? { "x-api-key": OPENAI_PROXY_KEY } : {}),
            },
            body: JSON.stringify({
                text: normalized,
                model: TTS_MODEL,
                voice: TTS_VOICE,
                format: TTS_FORMAT,
            }),
            signal: controller.signal,
        });
    } catch (error) {
        throw normalizeAIProxyError(error, "tts");
    } finally {
        clearTimeout(timeoutId);
    }

    if (!response.ok) {
        throw createAIHttpError(response.status, "tts");
    }

    let data: unknown;
    try {
        data = await response.json();
    } catch (error) {
        throw createAIInvalidPayloadError("tts", error);
    }

    const payload = (data ?? {}) as { audioBase64?: unknown; audioUrl?: unknown };
    const base64 = typeof payload.audioBase64 === "string" && payload.audioBase64 ? payload.audioBase64 : null;
    const directUrl = typeof payload.audioUrl === "string" && payload.audioUrl ? payload.audioUrl : null;

    if (directUrl) {
        AUDIO_CACHE.set(normalized, directUrl);
        await setPersistedPronunciationUri(normalized, directUrl, AUDIO_CACHE_TTL_MS);
        return directUrl;
    }

    const fileUri = base64 ? await writeAudioToFile(base64, normalized) : null;
    const finalUri = fileUri ?? (base64 ? `data:audio/${TTS_FORMAT};base64,${base64}` : null);

    if (!finalUri) {
        throw createAIInvalidPayloadError("tts");
    }

    AUDIO_CACHE.set(normalized, finalUri);
    if (shouldPersistAudioUri(finalUri)) {
        await setPersistedPronunciationUri(normalized, finalUri, AUDIO_CACHE_TTL_MS);
    }
    return finalUri;
}

async function resolveAudioUri(normalized: string): Promise<string> {
    const cachedUri = await resolveCachedAudioUri(normalized);
    if (cachedUri) {
        return cachedUri;
    }

    const inFlight = AUDIO_REQUESTS.get(normalized);
    if (inFlight) {
        return await inFlight;
    }

    const requestPromise = requestPronunciationAudio(normalized).finally(() => {
        AUDIO_REQUESTS.delete(normalized);
    });
    AUDIO_REQUESTS.set(normalized, requestPromise);
    return await requestPromise;
}

export async function getPronunciationAudio(word: string) {
    const normalized = normalizeWord(word);
    if (!normalized) {
        throw createAppError("ValidationError", "발음으로 변환할 단어가 없어요.", {
            code: "AI_TTS_EMPTY_WORD",
            retryable: false,
        });
    }

    if (!OPENAI_FEATURE_ENABLED || !OPENAI_PROXY_URL) {
        throw createAIUnavailableError("tts");
    }

    return await resolveAudioUri(normalized);
}

export async function prefetchPronunciationAudio(word: string): Promise<string> {
    return await getPronunciationAudio(word);
}

export async function invalidatePronunciationAudioCache(word: string): Promise<void> {
    const normalized = normalizeWord(word);
    if (!normalized) {
        return;
    }

    AUDIO_CACHE.delete(normalized);
    AUDIO_REQUESTS.delete(normalized);
    await deletePersistedPronunciationUri(normalized);
}
