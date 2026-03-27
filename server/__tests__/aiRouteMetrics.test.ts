const { buildAiRouteMetricsLog } = require("../aiRouteMetrics");

describe("aiRouteMetrics", () => {
    it("includes only defined metrics in the log line", () => {
        expect(
            buildAiRouteMetricsLog("/dictionary/examples", {
                cache: "miss",
                upstreamMs: 182,
                promptChars: 320,
                itemCount: 3,
                ignored: null,
            }),
        ).toBe("[AI] /dictionary/examples cache=miss upstreamMs=182 promptChars=320 itemCount=3");
    });

    it("returns a base prefix when no metrics are provided", () => {
        expect(buildAiRouteMetricsLog("/study/cards")).toBe("[AI] /study/cards");
    });
});
