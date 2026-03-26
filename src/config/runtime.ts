type RuntimeTarget = "expo" | "apps-in-toss";

type RuntimeConfig = {
    runtimeTarget: RuntimeTarget;
    appVersion: string;
    versionLabel: string;
    privacyPolicyUrl: string;
    termsOfServiceUrl: string;
    openAIProxyUrl: string;
    openAIProxyKey: string;
    aiHealthUrl: string;
    sentryDsn: string;
    featureAccountAuth?: unknown;
    featureGuestAccountCta?: unknown;
    featureBackupRestore?: unknown;
    featureReviewLoop?: unknown;
    featureReviewHomeDashboard?: unknown;
    featureReviewSessionUi?: unknown;
    featureDailyGoal?: unknown;
    featureReviewReminder?: unknown;
    featureCollections?: unknown;
    featureFavoritesBatchActions?: unknown;
    featureAiStudyMode?: unknown;
    featureAiStudyEntryPoints?: unknown;
    featureAiStudySessionUi?: unknown;
};

type ExpoConfigLike = {
    version?: unknown;
    extra?: Record<string, unknown> | null;
};

const DEFAULT_RUNTIME_CONFIG: RuntimeConfig = {
    runtimeTarget: "expo",
    appVersion: "1.0.0",
    versionLabel: "1.0.0",
    privacyPolicyUrl: "https://vocachip.app/legal/privacy",
    termsOfServiceUrl: "https://vocachip.app/legal/terms",
    openAIProxyUrl: "",
    openAIProxyKey: "",
    aiHealthUrl: "",
    sentryDsn: "",
};

type RuntimeScope = typeof globalThis & {
    __VOCACHIP_RUNTIME_CONFIG__?: Partial<RuntimeConfig>;
};

function getRuntimeScope(): RuntimeScope {
    return globalThis as RuntimeScope;
}

function readExpoConfig(): ExpoConfigLike | null {
    try {
        const moduleValue = require("expo-constants");
        const constants = moduleValue?.default ?? moduleValue;
        return constants?.expoConfig ?? null;
    } catch {
        return null;
    }
}

function readString(value: unknown, fallback: string): string {
    return typeof value === "string" ? value : fallback;
}

export function setRuntimeConfig(overrides: Partial<RuntimeConfig>) {
    const scope = getRuntimeScope();
    scope.__VOCACHIP_RUNTIME_CONFIG__ = {
        ...(scope.__VOCACHIP_RUNTIME_CONFIG__ ?? {}),
        ...overrides,
    };
}

function resolveRuntimeTarget(value: unknown): RuntimeTarget {
    if (value === "apps-in-toss" || value === "expo") {
        return value;
    }
    return DEFAULT_RUNTIME_CONFIG.runtimeTarget;
}

export function getRuntimeConfig(): RuntimeConfig {
    const expoConfig = readExpoConfig();
    const expoExtra: Record<string, unknown> = expoConfig?.extra ?? {};
    const runtime = getRuntimeScope().__VOCACHIP_RUNTIME_CONFIG__ ?? {};

    return {
        ...DEFAULT_RUNTIME_CONFIG,
        ...expoExtra,
        ...runtime,
        runtimeTarget: resolveRuntimeTarget(runtime.runtimeTarget),
        appVersion: readString(runtime.appVersion, readString(expoConfig?.version, DEFAULT_RUNTIME_CONFIG.appVersion)),
        versionLabel: readString(
            runtime.versionLabel,
            readString(expoExtra.versionLabel, DEFAULT_RUNTIME_CONFIG.versionLabel),
        ),
        privacyPolicyUrl: readString(
            runtime.privacyPolicyUrl,
            readString(expoExtra.privacyPolicyUrl, DEFAULT_RUNTIME_CONFIG.privacyPolicyUrl),
        ),
        termsOfServiceUrl: readString(
            runtime.termsOfServiceUrl,
            readString(expoExtra.termsOfServiceUrl, DEFAULT_RUNTIME_CONFIG.termsOfServiceUrl),
        ),
        openAIProxyUrl: readString(
            runtime.openAIProxyUrl,
            readString(expoExtra.openAIProxyUrl, DEFAULT_RUNTIME_CONFIG.openAIProxyUrl),
        ),
        openAIProxyKey: readString(
            runtime.openAIProxyKey,
            readString(expoExtra.openAIProxyKey, DEFAULT_RUNTIME_CONFIG.openAIProxyKey),
        ),
        aiHealthUrl: readString(
            runtime.aiHealthUrl,
            readString(expoExtra.aiHealthUrl, DEFAULT_RUNTIME_CONFIG.aiHealthUrl),
        ),
        sentryDsn: readString(runtime.sentryDsn, readString(expoExtra.sentryDsn, DEFAULT_RUNTIME_CONFIG.sentryDsn)),
    };
}
