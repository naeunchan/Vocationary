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

    const accountAuthFromEnv = parseBoolean(process.env.EXPO_PUBLIC_FEATURE_ACCOUNT_AUTH);
    const guestCtaFromEnv = parseBoolean(process.env.EXPO_PUBLIC_FEATURE_GUEST_ACCOUNT_CTA);
    const backupRestoreFromEnv = parseBoolean(process.env.EXPO_PUBLIC_FEATURE_BACKUP_RESTORE);
    const reviewLoopFromEnv = parseBoolean(process.env.EXPO_PUBLIC_FEATURE_REVIEW_LOOP);
    const reviewHomeDashboardFromEnv = parseBoolean(process.env.EXPO_PUBLIC_FEATURE_REVIEW_HOME_DASHBOARD);
    const reviewSessionUiFromEnv = parseBoolean(process.env.EXPO_PUBLIC_FEATURE_REVIEW_SESSION_UI);
    const dailyGoalFromEnv = parseBoolean(process.env.EXPO_PUBLIC_FEATURE_DAILY_GOAL);
    const reviewReminderFromEnv = parseBoolean(process.env.EXPO_PUBLIC_FEATURE_REVIEW_REMINDER);
    const collectionsFromEnv = parseBoolean(process.env.EXPO_PUBLIC_FEATURE_COLLECTIONS);
    const favoritesBatchActionsFromEnv = parseBoolean(process.env.EXPO_PUBLIC_FEATURE_FAVORITES_BATCH_ACTIONS);
    const aiStudyModeFromEnv = parseBoolean(process.env.EXPO_PUBLIC_FEATURE_AI_STUDY_MODE);
    const aiStudyEntryPointsFromEnv = parseBoolean(process.env.EXPO_PUBLIC_FEATURE_AI_STUDY_ENTRY_POINTS);
    const aiStudySessionUiFromEnv = parseBoolean(process.env.EXPO_PUBLIC_FEATURE_AI_STUDY_SESSION_UI);
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
            featureReviewLoop: reviewLoopFromEnv ?? profileDefaults.featureReviewLoop,
            featureReviewHomeDashboard: reviewHomeDashboardFromEnv ?? profileDefaults.featureReviewHomeDashboard,
            featureReviewSessionUi: reviewSessionUiFromEnv ?? profileDefaults.featureReviewSessionUi,
            featureDailyGoal: dailyGoalFromEnv ?? profileDefaults.featureDailyGoal,
            featureReviewReminder: reviewReminderFromEnv ?? profileDefaults.featureReviewReminder,
            featureCollections: collectionsFromEnv ?? profileDefaults.featureCollections,
            featureFavoritesBatchActions: favoritesBatchActionsFromEnv ?? profileDefaults.featureFavoritesBatchActions,
            featureAiStudyMode: aiStudyModeFromEnv ?? profileDefaults.featureAiStudyMode,
            featureAiStudyEntryPoints: aiStudyEntryPointsFromEnv ?? profileDefaults.featureAiStudyEntryPoints,
            featureAiStudySessionUi: aiStudySessionUiFromEnv ?? profileDefaults.featureAiStudySessionUi,
            openAIProxyUrl: openAIProxyUrlFromEnv,
            openAIProxyKey: openAIProxyKeyFromEnv,
            aiHealthUrl: aiHealthUrlFromEnv,
        },
    };

    return expoConfig;
};
