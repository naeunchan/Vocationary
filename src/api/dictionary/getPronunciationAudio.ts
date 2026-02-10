import * as FileSystem from "expo-file-system";

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
const AUDIO_CACHE: Map<string, string> = new Map();

function normalizeWord(input: string) {
    return input.trim().toLowerCase();
}

function resolveDirectory(): string | null {
    const fileSystemWithDirs = FileSystem as unknown as {
        cacheDirectory?: string | null;
        documentDirectory?: string | null;
    };
    const directory = fileSystemWithDirs.cacheDirectory ?? fileSystemWithDirs.documentDirectory;
    if (!directory) {
        return null;
    }
    return directory.endsWith("/") ? directory : `${directory}/`;
}

async function writeAudioToFile(base64Data: string, key: string) {
    const directory = resolveDirectory();
    const fileSystemWithWrite = FileSystem as unknown as {
        writeAsStringAsync?: (uri: string, contents: string, options?: { encoding?: string }) => Promise<void>;
        EncodingType?: { Base64?: string };
    };

    if (!directory || typeof fileSystemWithWrite.writeAsStringAsync !== "function") {
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

    const cachedUri = AUDIO_CACHE.get(normalized);
    if (cachedUri) {
        if (cachedUri.startsWith("file://")) {
            try {
                const info = await FileSystem.getInfoAsync(cachedUri);
                if (info.exists) {
                    return cachedUri;
                }
            } catch {
                // Ignore and refresh cache below.
            }
            AUDIO_CACHE.delete(normalized);
        } else {
            return cachedUri;
        }
    }

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

    const fileUri = base64 ? await writeAudioToFile(base64, normalized) : null;
    const finalUri = fileUri ?? directUrl ?? (base64 ? `data:audio/${TTS_FORMAT};base64,${base64}` : null);

    if (!finalUri) {
        throw createAIInvalidPayloadError("tts");
    }

    AUDIO_CACHE.set(normalized, finalUri);
    return finalUri;
}
