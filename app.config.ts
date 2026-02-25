import type { ExpoConfig } from "@expo/config-types";

const staticConfig = require("./app.json") as { expo: ExpoConfig };

function parseBoolean(value: string | undefined): boolean | null {
    if (!value) return null;
    const normalized = value.trim().toLowerCase();
    if (["1", "true", "on", "yes"].includes(normalized)) return true;
    if (["0", "false", "off", "no"].includes(normalized)) return false;
    return null;
}

function parseString(value: string | undefined): string {
    if (!value) return "";
    return value.trim();
}

function resolveProfile() {
    const profile = (process.env.EAS_BUILD_PROFILE ?? process.env.APP_ENV ?? "").trim().toLowerCase();
    if (profile) return profile;
    return process.env.NODE_ENV === "production" ? "production" : "development";
}

export default (): ExpoConfig => {
    const profile = resolveProfile();
    const isProduction = profile === "production";
    const profileDefaults = {
        featureGuestAccountCta: !isProduction,
        featureBackupRestore: false,
    };

    const guestCtaFromEnv = parseBoolean(process.env.EXPO_PUBLIC_FEATURE_GUEST_ACCOUNT_CTA);
    const backupRestoreFromEnv = parseBoolean(process.env.EXPO_PUBLIC_FEATURE_BACKUP_RESTORE);
    const openAIProxyUrlFromEnv = parseString(process.env.EXPO_PUBLIC_OPENAI_PROXY_URL);
    const openAIProxyKeyFromEnv = parseString(process.env.EXPO_PUBLIC_OPENAI_PROXY_KEY);
    const aiHealthUrlFromEnv = parseString(process.env.EXPO_PUBLIC_AI_HEALTH_URL);
    const firebaseApiKeyFromEnv = parseString(process.env.EXPO_PUBLIC_FIREBASE_API_KEY);
    const firebaseAuthDomainFromEnv = parseString(process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN);
    const firebaseProjectIdFromEnv = parseString(process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID);
    const firebaseAppIdFromEnv = parseString(process.env.EXPO_PUBLIC_FIREBASE_APP_ID);
    const firebaseMessagingSenderIdFromEnv = parseString(process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID);
    const firebaseStorageBucketFromEnv = parseString(process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET);
    const firebaseMeasurementIdFromEnv = parseString(process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID);

    const expoConfig: ExpoConfig = {
        ...staticConfig.expo,
        extra: {
            ...(staticConfig.expo.extra ?? {}),
            featureProfile: profile,
            featureGuestAccountCta: guestCtaFromEnv ?? profileDefaults.featureGuestAccountCta,
            featureBackupRestore: backupRestoreFromEnv ?? profileDefaults.featureBackupRestore,
            openAIProxyUrl: openAIProxyUrlFromEnv,
            openAIProxyKey: openAIProxyKeyFromEnv,
            aiHealthUrl: aiHealthUrlFromEnv,
            firebaseApiKey: firebaseApiKeyFromEnv,
            firebaseAuthDomain: firebaseAuthDomainFromEnv,
            firebaseProjectId: firebaseProjectIdFromEnv,
            firebaseAppId: firebaseAppIdFromEnv,
            firebaseMessagingSenderId: firebaseMessagingSenderIdFromEnv,
            firebaseStorageBucket: firebaseStorageBucketFromEnv,
            firebaseMeasurementId: firebaseMeasurementIdFromEnv,
        },
    };

    return expoConfig;
};
