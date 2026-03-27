const { createAiMetricsStore } = require("../aiMetrics");

describe("aiMetrics", () => {
    it("aggregates success metrics by route", () => {
        let currentTime = 1000;
        const store = createAiMetricsStore({
            now: () => currentTime,
        });

        store.recordSuccess("/dictionary/examples", {
            cache: "miss",
            upstreamMs: 180,
        });
        currentTime += 50;
        store.recordSuccess("/dictionary/examples", {
            cache: "hit",
        });
        currentTime += 50;
        store.recordSuccess("/study/cards", {
            cache: "miss",
            upstreamMs: 220,
        });

        const snapshot = store.snapshot();

        expect(snapshot.totals).toEqual(
            expect.objectContaining({
                requestCount: 3,
                successCount: 3,
                errorCount: 0,
                cacheHits: 1,
                cacheMisses: 2,
                upstreamRequestCount: 2,
                upstreamAverageMs: 200,
                upstreamMaxMs: 220,
            }),
        );
        expect(snapshot.routes["/dictionary/examples"]).toEqual(
            expect.objectContaining({
                requestCount: 2,
                cacheHits: 1,
                cacheMisses: 1,
                upstreamRequestCount: 1,
                upstreamAverageMs: 180,
            }),
        );
    });

    it("tracks failures separately from successful requests", () => {
        const store = createAiMetricsStore();

        store.recordFailure("/dictionary/tts", new Error("upstream_timeout"));

        const snapshot = store.snapshot();

        expect(snapshot.totals).toEqual(
            expect.objectContaining({
                requestCount: 1,
                successCount: 0,
                errorCount: 1,
            }),
        );
        expect(snapshot.routes["/dictionary/tts"]).toEqual(
            expect.objectContaining({
                requestCount: 1,
                errorCount: 1,
                lastErrorMessage: "upstream_timeout",
            }),
        );
    });
});
