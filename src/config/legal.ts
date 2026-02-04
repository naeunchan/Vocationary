import Constants from "expo-constants";

/**
 * Reads legal URLs from Expo extra so we don't accidentally ship placeholder links.
 * When empty, the app will show the built-in legal modal instead of opening a broken URL.
 */
const extra = Constants.expoConfig?.extra ?? {};

const BLOCKED_HOSTS = new Set(["192.168.0.31", "127.0.0.1", "0.0.0.0", "example.com"]);

function isPrivateIp(hostname: string) {
    const match = hostname.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
    if (!match) return false;
    const [a, b] = [Number(match[1]), Number(match[2])];
    if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
    return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

function sanitizeLegalUrl(input: unknown): string {
    if (typeof input !== "string") return "";
    const trimmed = input.trim();
    if (!trimmed) return "";
    try {
        const url = new URL(trimmed);
        if (url.protocol !== "https:") return "";
        const host = url.hostname.toLowerCase();
        if (BLOCKED_HOSTS.has(host) || isPrivateIp(host)) return "";
        return url.toString();
    } catch {
        return "";
    }
}

/**
 * Ensure these are real, hosted HTTPS URLs before release.
 * If invalid/missing, the app will fallback to in-app legal documents.
 */
export const PRIVACY_POLICY_URL = sanitizeLegalUrl(extra.privacyPolicyUrl);
export const TERMS_OF_SERVICE_URL = sanitizeLegalUrl(extra.termsOfServiceUrl);
