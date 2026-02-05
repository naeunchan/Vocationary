import Constants from "expo-constants";

const extra = Constants.expoConfig?.extra ?? {};

const proxyFromExtra = typeof extra.openAIProxyUrl === "string" ? extra.openAIProxyUrl.trim() : "";
const proxyFromEnv = (process.env.EXPO_PUBLIC_OPENAI_PROXY_URL ?? "").trim();
const proxyKeyFromExtra = typeof extra.openAIProxyKey === "string" ? extra.openAIProxyKey.trim() : "";
const proxyKeyFromEnv = (process.env.EXPO_PUBLIC_OPENAI_PROXY_KEY ?? "").trim();

/**
 * Backend proxy URL used for AI-powered features (examples/TTS).
 * TODO: Replace the placeholder with your deployed backend endpoint before release.
 */
export const OPENAI_PROXY_URL = proxyFromEnv || proxyFromExtra;
export const OPENAI_PROXY_KEY = proxyKeyFromEnv || proxyKeyFromExtra;

/**
 * Gatekeeper flag so AI features stay off by default in production builds
 * unless a secure backend proxy is configured.
 */
export const OPENAI_FEATURE_ENABLED = Boolean(OPENAI_PROXY_URL && OPENAI_PROXY_KEY);

const healthFromEnv = (process.env.EXPO_PUBLIC_AI_HEALTH_URL ?? "").trim();
/**
 * Optional health check URL for AI proxy.
 * Defaults to `<OPENAI_PROXY_URL>/health` when configured.
 */
export const AI_HEALTH_URL =
    healthFromEnv || (OPENAI_PROXY_URL ? `${OPENAI_PROXY_URL.replace(/\/+$/, "")}/health` : "");

if (__DEV__) {
    const maskedKey =
        OPENAI_PROXY_KEY.length >= 4
            ? `***${OPENAI_PROXY_KEY.slice(-4)} (len:${OPENAI_PROXY_KEY.length})`
            : OPENAI_PROXY_KEY
              ? "*** (short)"
              : "(empty)";
    console.log(
        `[openAI config] enabled=${OPENAI_FEATURE_ENABLED} url=${OPENAI_PROXY_URL || "(empty)"} key=${maskedKey} health=${AI_HEALTH_URL || "(empty)"}`,
    );
}
