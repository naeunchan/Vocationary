import * as FileSystem from "expo-file-system";
import { Buffer } from "buffer";
import { tryGetOpenAIClient } from "@/api/dictionary/openAIClient";

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
		writeAsStringAsync?: (
			uri: string,
			contents: string,
			options?: { encoding?: string },
		) => Promise<void>;
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
		throw new Error("발음으로 변환할 단어가 없어요.");
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

	const client = tryGetOpenAIClient();
	if (!client) {
		throw new Error("OpenAI API 키가 설정되어 있지 않아 발음을 생성할 수 없어요.");
	}
	let response;
	try {
		response = await client.audio.speech.create({
			model: TTS_MODEL,
			voice: TTS_VOICE,
			input: normalized,
			response_format: TTS_FORMAT,
		});
	} catch (error) {
		console.warn("[dictionary] Failed to synthesize pronunciation.", error);
		throw new Error("발음을 생성하지 못했어요. 네트워크 상태를 확인한 뒤 다시 시도해주세요.");
	}

	const arrayBuffer = await response.arrayBuffer();
	const buffer = Buffer.from(arrayBuffer);
	const base64 = buffer.toString("base64");
	const fileUri = await writeAudioToFile(base64, normalized);
	const finalUri = fileUri ?? `data:audio/${TTS_FORMAT};base64,${base64}`;

	AUDIO_CACHE.set(normalized, finalUri);
	return finalUri;
}
