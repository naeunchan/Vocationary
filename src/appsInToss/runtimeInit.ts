import { setRuntimeConfig } from "../config/runtime";

type ImportMetaWithEnv = ImportMeta & {
    env?: Record<string, unknown>;
};

const metaEnv = (import.meta as ImportMetaWithEnv).env;
const runtimeEnv: Record<string, unknown> = metaEnv ?? {};

function readString(name: string, fallback = ""): string {
    const value = runtimeEnv[name];
    return typeof value === "string" ? value : fallback;
}

setRuntimeConfig({
    runtimeTarget: "apps-in-toss",
    appVersion: readString("VOCACHIP_APP_VERSION", "1.0.0"),
    versionLabel: readString("VOCACHIP_VERSION_LABEL", "1.0.0"),
    privacyPolicyUrl: readString("VOCACHIP_PRIVACY_POLICY_URL"),
    termsOfServiceUrl: readString("VOCACHIP_TERMS_OF_SERVICE_URL"),
    openAIProxyUrl: readString("EXPO_PUBLIC_OPENAI_PROXY_URL"),
    openAIProxyKey: readString("EXPO_PUBLIC_OPENAI_PROXY_KEY"),
    aiHealthUrl: readString("EXPO_PUBLIC_AI_HEALTH_URL"),
    sentryDsn: readString("EXPO_PUBLIC_SENTRY_DSN"),
    featureAccountAuth: runtimeEnv.EXPO_PUBLIC_FEATURE_ACCOUNT_AUTH,
    featureGuestAccountCta: runtimeEnv.EXPO_PUBLIC_FEATURE_GUEST_ACCOUNT_CTA,
    featureBackupRestore: runtimeEnv.EXPO_PUBLIC_FEATURE_BACKUP_RESTORE,
    featureReviewLoop: runtimeEnv.EXPO_PUBLIC_FEATURE_REVIEW_LOOP,
    featureReviewHomeDashboard: runtimeEnv.EXPO_PUBLIC_FEATURE_REVIEW_HOME_DASHBOARD,
    featureReviewSessionUi: runtimeEnv.EXPO_PUBLIC_FEATURE_REVIEW_SESSION_UI,
    featureDailyGoal: runtimeEnv.EXPO_PUBLIC_FEATURE_DAILY_GOAL,
    featureReviewReminder: runtimeEnv.EXPO_PUBLIC_FEATURE_REVIEW_REMINDER,
    featureCollections: runtimeEnv.EXPO_PUBLIC_FEATURE_COLLECTIONS,
    featureFavoritesBatchActions: runtimeEnv.EXPO_PUBLIC_FEATURE_FAVORITES_BATCH_ACTIONS,
    featureAiStudyMode: runtimeEnv.EXPO_PUBLIC_FEATURE_AI_STUDY_MODE,
    featureAiStudyEntryPoints: runtimeEnv.EXPO_PUBLIC_FEATURE_AI_STUDY_ENTRY_POINTS,
    featureAiStudySessionUi: runtimeEnv.EXPO_PUBLIC_FEATURE_AI_STUDY_SESSION_UI,
});
