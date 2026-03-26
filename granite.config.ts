import { appsInToss } from "@apps-in-toss/framework/plugins";
import { env } from "@granite-js/plugin-env";
import { defineConfig } from "@granite-js/react-native/config";

const path = require("path");
const packageJson = require(path.resolve(process.cwd(), "package.json"));
const staticConfig = require(path.resolve(process.cwd(), "app.json"));

function parseBoolean(value?: string | null) {
    if (!value) return null;
    const normalized = value.trim().toLowerCase();
    if (["1", "true", "on", "yes"].includes(normalized)) return true;
    if (["0", "false", "off", "no"].includes(normalized)) return false;
    return null;
}

function toEnvBoolean(value: boolean) {
    return value ? "true" : "false";
}

function resolveString(value: unknown, fallback = "") {
    return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function resolveProfile() {
    const profile = resolveString(process.env.APP_ENV).toLowerCase();
    if (profile) return profile;
    return process.env.NODE_ENV === "production" ? "production" : "development";
}

const expoConfig = staticConfig.expo ?? {};
const expoExtra = expoConfig.extra ?? {};
const profile = resolveProfile();
const isProduction = profile === "production";
const profileDefaults = {
    featureAccountAuth: !isProduction,
    featureGuestAccountCta: !isProduction,
    featureBackupRestore: false,
    featureReviewLoop: false,
    featureReviewHomeDashboard: false,
    featureReviewSessionUi: false,
    featureDailyGoal: false,
    featureReviewReminder: false,
    featureCollections: false,
    featureFavoritesBatchActions: false,
    featureAiStudyMode: false,
    featureAiStudyEntryPoints: false,
    featureAiStudySessionUi: false,
};

function resolveFlag(name: keyof typeof profileDefaults, envName: string) {
    const envValue = parseBoolean(process.env[envName]);
    if (envValue !== null) {
        return envValue;
    }
    const extraValue = expoExtra[name];
    if (typeof extraValue === "boolean") {
        return extraValue;
    }
    return profileDefaults[name];
}

const appVersion = resolveString(expoConfig.version, resolveString(packageJson.version, "1.0.0"));
const versionLabel = resolveString(expoExtra.versionLabel, appVersion);
const primaryColor = resolveString(
    process.env.AIT_PRIMARY_COLOR,
    resolveString(expoConfig.splash?.backgroundColor, "#1d4ed8"),
);

export default defineConfig({
    scheme: "intoss",
    appName: resolveString(process.env.AIT_APP_NAME, resolveString(packageJson.name, "vocachip")),
    entryFile: "./src/_app.tsx",
    outdir: "dist",
    cwd: process.cwd(),
    build: {
        resolver: {
            alias: [{ from: "@", to: path.resolve(process.cwd(), "src"), exact: false }],
        },
    },
    plugins: [
        appsInToss({
            brand: {
                displayName: resolveString(process.env.AIT_DISPLAY_NAME, "Vocachip"),
                primaryColor,
                icon: resolveString(process.env.AIT_APP_ICON_URL, ""),
            },
            permissions: [],
        }),
        env({
            VOCACHIP_APP_VERSION: appVersion,
            VOCACHIP_VERSION_LABEL: versionLabel,
            VOCACHIP_PRIVACY_POLICY_URL: resolveString(
                process.env.VOCACHIP_PRIVACY_POLICY_URL,
                resolveString(expoExtra.privacyPolicyUrl),
            ),
            VOCACHIP_TERMS_OF_SERVICE_URL: resolveString(
                process.env.VOCACHIP_TERMS_OF_SERVICE_URL,
                resolveString(expoExtra.termsOfServiceUrl),
            ),
            EXPO_PUBLIC_SENTRY_DSN: resolveString(process.env.EXPO_PUBLIC_SENTRY_DSN),
            EXPO_PUBLIC_OPENAI_PROXY_URL: resolveString(
                process.env.EXPO_PUBLIC_OPENAI_PROXY_URL,
                resolveString(expoExtra.openAIProxyUrl),
            ),
            EXPO_PUBLIC_OPENAI_PROXY_KEY: resolveString(
                process.env.EXPO_PUBLIC_OPENAI_PROXY_KEY,
                resolveString(expoExtra.openAIProxyKey),
            ),
            EXPO_PUBLIC_AI_HEALTH_URL: resolveString(
                process.env.EXPO_PUBLIC_AI_HEALTH_URL,
                resolveString(expoExtra.aiHealthUrl),
            ),
            EXPO_PUBLIC_FEATURE_ACCOUNT_AUTH: toEnvBoolean(
                resolveFlag("featureAccountAuth", "EXPO_PUBLIC_FEATURE_ACCOUNT_AUTH"),
            ),
            EXPO_PUBLIC_FEATURE_GUEST_ACCOUNT_CTA: toEnvBoolean(
                resolveFlag("featureGuestAccountCta", "EXPO_PUBLIC_FEATURE_GUEST_ACCOUNT_CTA"),
            ),
            EXPO_PUBLIC_FEATURE_BACKUP_RESTORE: toEnvBoolean(
                resolveFlag("featureBackupRestore", "EXPO_PUBLIC_FEATURE_BACKUP_RESTORE"),
            ),
            EXPO_PUBLIC_FEATURE_REVIEW_LOOP: toEnvBoolean(
                resolveFlag("featureReviewLoop", "EXPO_PUBLIC_FEATURE_REVIEW_LOOP"),
            ),
            EXPO_PUBLIC_FEATURE_REVIEW_HOME_DASHBOARD: toEnvBoolean(
                resolveFlag("featureReviewHomeDashboard", "EXPO_PUBLIC_FEATURE_REVIEW_HOME_DASHBOARD"),
            ),
            EXPO_PUBLIC_FEATURE_REVIEW_SESSION_UI: toEnvBoolean(
                resolveFlag("featureReviewSessionUi", "EXPO_PUBLIC_FEATURE_REVIEW_SESSION_UI"),
            ),
            EXPO_PUBLIC_FEATURE_DAILY_GOAL: toEnvBoolean(
                resolveFlag("featureDailyGoal", "EXPO_PUBLIC_FEATURE_DAILY_GOAL"),
            ),
            EXPO_PUBLIC_FEATURE_REVIEW_REMINDER: toEnvBoolean(
                resolveFlag("featureReviewReminder", "EXPO_PUBLIC_FEATURE_REVIEW_REMINDER"),
            ),
            EXPO_PUBLIC_FEATURE_COLLECTIONS: toEnvBoolean(
                resolveFlag("featureCollections", "EXPO_PUBLIC_FEATURE_COLLECTIONS"),
            ),
            EXPO_PUBLIC_FEATURE_FAVORITES_BATCH_ACTIONS: toEnvBoolean(
                resolveFlag("featureFavoritesBatchActions", "EXPO_PUBLIC_FEATURE_FAVORITES_BATCH_ACTIONS"),
            ),
            EXPO_PUBLIC_FEATURE_AI_STUDY_MODE: toEnvBoolean(
                resolveFlag("featureAiStudyMode", "EXPO_PUBLIC_FEATURE_AI_STUDY_MODE"),
            ),
            EXPO_PUBLIC_FEATURE_AI_STUDY_ENTRY_POINTS: toEnvBoolean(
                resolveFlag("featureAiStudyEntryPoints", "EXPO_PUBLIC_FEATURE_AI_STUDY_ENTRY_POINTS"),
            ),
            EXPO_PUBLIC_FEATURE_AI_STUDY_SESSION_UI: toEnvBoolean(
                resolveFlag("featureAiStudySessionUi", "EXPO_PUBLIC_FEATURE_AI_STUDY_SESSION_UI"),
            ),
        }),
    ],
});
