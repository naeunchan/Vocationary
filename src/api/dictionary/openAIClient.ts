import Constants from "expo-constants";
import OpenAI from "openai";
import { OPENAI_API_KEY } from "@env";

export const OPENAI_MINI_MODEL = "gpt-4o-mini";

type ExtraConfig = {
	openaiApiKey?: string;
};

function getOpenAIApiKey(): string | null {
	const inlineKey = typeof OPENAI_API_KEY === "string" ? OPENAI_API_KEY.trim() : "";
	if (inlineKey) {
		return inlineKey;
	}

	const envKey = (process.env.OPENAI_API_KEY ?? process.env.EXPO_PUBLIC_OPENAI_API_KEY)?.trim();
	if (envKey) {
		return envKey;
	}

	const extraConfig = Constants.expoConfig?.extra as ExtraConfig | undefined;
	const extraKey = extraConfig?.openaiApiKey?.trim();
	if (extraKey) {
		return extraKey;
	}

	return null;
}

let cachedClient: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
	const apiKey = getOpenAIApiKey();
	if (!apiKey) {
		throw new Error("OpenAI API 키가 설정되어 있지 않아요.");
	}
	if (!cachedClient) {
		cachedClient = new OpenAI({
			apiKey,
			dangerouslyAllowBrowser: true,
		});
	}
	return cachedClient;
}

export function tryGetOpenAIClient(): OpenAI | null {
	try {
		return getOpenAIClient();
	} catch (error) {
		console.warn("[dictionary] OpenAI client unavailable.", error);
		return null;
	}
}
