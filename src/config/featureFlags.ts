import Constants from "expo-constants";

type AppExtra = {
    featureAuthUi?: unknown;
    featureGuestAccountCta?: unknown;
};

type FeatureFlags = {
    authUi: boolean;
    guestAccountCta: boolean;
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
    // Hidden by default until full auth UX is connected.
    authUi: resolveFlag(process.env.EXPO_PUBLIC_FEATURE_AUTH_UI, extra.featureAuthUi, false),
    // Hidden by default since login/signup path is disabled in current release.
    guestAccountCta: resolveFlag(
        process.env.EXPO_PUBLIC_FEATURE_GUEST_ACCOUNT_CTA,
        extra.featureGuestAccountCta,
        false,
    ),
};
