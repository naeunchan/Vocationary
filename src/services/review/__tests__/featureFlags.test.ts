const originalEnv = {
    reviewLoop: process.env.EXPO_PUBLIC_FEATURE_REVIEW_LOOP,
    reviewHomeDashboard: process.env.EXPO_PUBLIC_FEATURE_REVIEW_HOME_DASHBOARD,
    reviewSessionUi: process.env.EXPO_PUBLIC_FEATURE_REVIEW_SESSION_UI,
};

function restoreEnv() {
    process.env.EXPO_PUBLIC_FEATURE_REVIEW_LOOP = originalEnv.reviewLoop;
    process.env.EXPO_PUBLIC_FEATURE_REVIEW_HOME_DASHBOARD = originalEnv.reviewHomeDashboard;
    process.env.EXPO_PUBLIC_FEATURE_REVIEW_SESSION_UI = originalEnv.reviewSessionUi;
}

function loadFeatureFlags(extra: Record<string, unknown> = {}) {
    let loaded: typeof import("@/config/featureFlags");

    jest.resetModules();
    jest.isolateModules(() => {
        jest.doMock("expo-constants", () => ({
            expoConfig: { extra },
        }));
        loaded = require("@/config/featureFlags") as typeof import("@/config/featureFlags");
    });

    return loaded!;
}

describe("review feature flags", () => {
    beforeEach(() => {
        restoreEnv();
    });

    afterEach(() => {
        restoreEnv();
        jest.resetModules();
        jest.clearAllMocks();
    });

    it("defaults all review flags to off", () => {
        const { FEATURE_FLAGS } = loadFeatureFlags();

        expect(FEATURE_FLAGS).toMatchObject({
            reviewLoop: false,
            reviewHomeDashboard: false,
            reviewSessionUi: false,
        });
    });

    it("resolves review flags from env vars before app config extras", () => {
        process.env.EXPO_PUBLIC_FEATURE_REVIEW_LOOP = "true";
        process.env.EXPO_PUBLIC_FEATURE_REVIEW_HOME_DASHBOARD = "false";
        process.env.EXPO_PUBLIC_FEATURE_REVIEW_SESSION_UI = "on";

        const { FEATURE_FLAGS } = loadFeatureFlags({
            featureReviewLoop: false,
            featureReviewHomeDashboard: true,
            featureReviewSessionUi: false,
        });

        expect(FEATURE_FLAGS).toMatchObject({
            reviewLoop: true,
            reviewHomeDashboard: false,
            reviewSessionUi: true,
        });
    });
});
