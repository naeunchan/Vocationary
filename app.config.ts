const staticConfig = require("./app.json");

function parseBoolean(value) {
    if (!value) return null;
    const normalized = value.trim().toLowerCase();
    if (["1", "true", "on", "yes"].includes(normalized)) return true;
    if (["0", "false", "off", "no"].includes(normalized)) return false;
    return null;
}

function parseString(value) {
    if (!value) return "";
    return value.trim();
}

function resolveProfile() {
    const profile = (process.env.APP_ENV ?? "").trim().toLowerCase();
    if (profile) return profile;
    return process.env.NODE_ENV === "production" ? "production" : "development";
}

module.exports = () => {
    const profile = resolveProfile();
    const isProduction = profile === "production";
    const profileDefaults = {
        featureAccountAuth: !isProduction,
        featureGuestAccountCta: !isProduction,
        featureBackupRestore: false,
    };

    const accountAuthFromEnv = parseBoolean(process.env.EXPO_PUBLIC_FEATURE_ACCOUNT_AUTH);
    const guestCtaFromEnv = parseBoolean(process.env.EXPO_PUBLIC_FEATURE_GUEST_ACCOUNT_CTA);
    const backupRestoreFromEnv = parseBoolean(process.env.EXPO_PUBLIC_FEATURE_BACKUP_RESTORE);
    const openAIProxyUrlFromEnv = parseString(process.env.EXPO_PUBLIC_OPENAI_PROXY_URL);
    const openAIProxyKeyFromEnv = parseString(process.env.EXPO_PUBLIC_OPENAI_PROXY_KEY);
    const aiHealthUrlFromEnv = parseString(process.env.EXPO_PUBLIC_AI_HEALTH_URL);

    const expoConfig = {
        ...staticConfig.expo,
        extra: {
            ...(staticConfig.expo.extra ?? {}),
            featureProfile: profile,
            featureAccountAuth: accountAuthFromEnv ?? profileDefaults.featureAccountAuth,
            featureGuestAccountCta: guestCtaFromEnv ?? profileDefaults.featureGuestAccountCta,
            featureBackupRestore: backupRestoreFromEnv ?? profileDefaults.featureBackupRestore,
            openAIProxyUrl: openAIProxyUrlFromEnv,
            openAIProxyKey: openAIProxyKeyFromEnv,
            aiHealthUrl: aiHealthUrlFromEnv,
        },
    };

    return expoConfig;
};
