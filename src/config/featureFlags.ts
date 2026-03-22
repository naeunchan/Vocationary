import Constants from "expo-constants";

type AppExtra = {
    featureAccountAuth?: unknown;
    featureGuestAccountCta?: unknown;
    featureBackupRestore?: unknown;
    featureReviewLoop?: unknown;
    featureReviewHomeDashboard?: unknown;
    featureReviewSessionUi?: unknown;
};

type FeatureFlags = {
    accountAuth: boolean;
    guestAccountCta: boolean;
    backupRestore: boolean;
    reviewLoop: boolean;
    reviewHomeDashboard: boolean;
    reviewSessionUi: boolean;
};

const extra = (Constants.expoConfig?.extra ?? {}) as AppExtra;

function parseBooleanFlag(value: unknown): boolean | null {
    if (typeof value === "boolean") {
        return value;
    }
    if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        if (normalized === "true" || normalized === "1" || normalized === "on") {
            return true;
        }
        if (normalized === "false" || normalized === "0" || normalized === "off") {
            return false;
        }
    }
    return null;
}

function resolveFlag(envValue: string | undefined, extraValue: unknown, fallback: boolean): boolean {
    const parsedEnv = parseBooleanFlag(envValue);
    if (parsedEnv !== null) {
        return parsedEnv;
    }

    const parsedExtra = parseBooleanFlag(extraValue);
    if (parsedExtra !== null) {
        return parsedExtra;
    }

    return fallback;
}

export const FEATURE_FLAGS: FeatureFlags = {
    // Defaults to enabled outside production unless app config explicitly turns it off.
    accountAuth: resolveFlag(process.env.EXPO_PUBLIC_FEATURE_ACCOUNT_AUTH, extra.featureAccountAuth, true),
    // Hidden by default since login/signup path is disabled in current release.
    guestAccountCta: resolveFlag(
        process.env.EXPO_PUBLIC_FEATURE_GUEST_ACCOUNT_CTA,
        extra.featureGuestAccountCta,
        false,
    ),
    // Hidden by default until UX/security policy is finalized.
    backupRestore: resolveFlag(process.env.EXPO_PUBLIC_FEATURE_BACKUP_RESTORE, extra.featureBackupRestore, false),
    // Hidden by default until the review loop is validated end-to-end.
    reviewLoop: resolveFlag(process.env.EXPO_PUBLIC_FEATURE_REVIEW_LOOP, extra.featureReviewLoop, false),
    // Hidden by default until the review dashboard contract is ready.
    reviewHomeDashboard: resolveFlag(
        process.env.EXPO_PUBLIC_FEATURE_REVIEW_HOME_DASHBOARD,
        extra.featureReviewHomeDashboard,
        false,
    ),
    // Hidden by default until the dedicated review session UI is ready.
    reviewSessionUi: resolveFlag(
        process.env.EXPO_PUBLIC_FEATURE_REVIEW_SESSION_UI,
        extra.featureReviewSessionUi,
        false,
    ),
};
