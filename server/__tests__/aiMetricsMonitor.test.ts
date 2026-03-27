const {
    buildRouteThresholds,
    evaluateAiMetricsSnapshot,
    resolveMetricsApiKey,
    resolveMetricsUrl,
} = require("../aiMetricsMonitor");

describe("aiMetricsMonitor", () => {
    it("falls back to the proxy metrics URL when no explicit metrics URL is set", () => {
        expect(
            resolveMetricsUrl({
                EXPO_PUBLIC_OPENAI_PROXY_URL: "https://api.example.com/",
            }),
        ).toBe("https://api.example.com/metrics");
    });

    it("uses API key overrides in priority order", () => {
        expect(
            resolveMetricsApiKey({
                AI_METRICS_API_KEY: "metrics-key",
                AI_PROXY_KEY: "server-key",
                EXPO_PUBLIC_OPENAI_PROXY_KEY: "client-key",
            }),
        ).toBe("metrics-key");
        expect(
            resolveMetricsApiKey({
                AI_PROXY_KEY: "server-key",
                EXPO_PUBLIC_OPENAI_PROXY_KEY: "client-key",
            }),
        ).toBe("server-key");
    });

    it("merges threshold overrides with defaults", () => {
        const thresholds = buildRouteThresholds(
            JSON.stringify({
                "/dictionary/examples": {
                    maxUpstreamAverageMs: 1900,
                },
            }),
        );

        expect(thresholds["/dictionary/examples"]).toEqual(
            expect.objectContaining({
                minRequests: 3,
                maxErrorRate: 0.15,
                minCacheHitRate: 0.2,
                maxUpstreamAverageMs: 1900,
            }),
        );
    });

    it("flags high error rates and slow upstream averages", () => {
        const snapshot = {
            routes: {
                "/dictionary/examples": {
                    requestCount: 10,
                    errorCount: 3,
                    cacheHitRate: 0.4,
                    upstreamAverageMs: 2700,
                },
            },
        };

        const result = evaluateAiMetricsSnapshot(snapshot, buildRouteThresholds(""));

        expect(result.errors).toEqual([
            "/dictionary/examples: error rate 30.0% exceeded 15.0% (3/10).",
            "/dictionary/examples: upstream average 2700ms exceeded 2500ms.",
        ]);
    });

    it("warns on weak cache hit rates and missing routes", () => {
        const snapshot = {
            routes: {
                "/dictionary/tts": {
                    requestCount: 4,
                    errorCount: 0,
                    cacheHitRate: 0.1,
                    upstreamAverageMs: 1200,
                },
            },
        };

        const result = evaluateAiMetricsSnapshot(snapshot, buildRouteThresholds(""));

        expect(result.warnings).toContain("/dictionary/tts: cache hit rate 10.0% is below 35.0%.");
        expect(result.warnings).toContain("/dictionary/examples: no metrics observed yet.");
        expect(result.warnings).toContain("/study/cards: no metrics observed yet.");
    });
});
