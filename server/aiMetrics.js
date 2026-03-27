function createRouteMetricsSnapshot(metrics) {
    const cacheTotal = metrics.cacheHits + metrics.cacheMisses;
    const upstreamAverageMs =
        metrics.upstreamCount > 0 ? Math.round(metrics.upstreamTotalMs / metrics.upstreamCount) : null;

    return {
        requestCount: metrics.requestCount,
        successCount: metrics.successCount,
        errorCount: metrics.errorCount,
        cacheHits: metrics.cacheHits,
        cacheMisses: metrics.cacheMisses,
        cacheHitRate: cacheTotal > 0 ? Number((metrics.cacheHits / cacheTotal).toFixed(4)) : null,
        upstreamRequestCount: metrics.upstreamCount,
        upstreamAverageMs,
        upstreamMaxMs: metrics.upstreamMaxMs || null,
        lastSeenAt: metrics.lastSeenAt || null,
        lastErrorAt: metrics.lastErrorAt || null,
        lastErrorMessage: metrics.lastErrorMessage || null,
    };
}

function createAiMetricsStore(options = {}) {
    const now = typeof options.now === "function" ? options.now : Date.now;
    const startedAt = now();
    const routes = new Map();

    function ensureRoute(route) {
        const existing = routes.get(route);
        if (existing) {
            return existing;
        }

        const created = {
            requestCount: 0,
            successCount: 0,
            errorCount: 0,
            cacheHits: 0,
            cacheMisses: 0,
            upstreamCount: 0,
            upstreamTotalMs: 0,
            upstreamMaxMs: 0,
            lastSeenAt: 0,
            lastErrorAt: 0,
            lastErrorMessage: null,
        };
        routes.set(route, created);
        return created;
    }

    function recordSuccess(route, observation = {}) {
        const metrics = ensureRoute(route);
        metrics.requestCount += 1;
        metrics.successCount += 1;
        metrics.lastSeenAt = now();

        if (observation.cache === "hit") {
            metrics.cacheHits += 1;
        } else if (observation.cache === "miss") {
            metrics.cacheMisses += 1;
        }

        if (Number.isFinite(observation.upstreamMs) && observation.upstreamMs >= 0) {
            metrics.upstreamCount += 1;
            metrics.upstreamTotalMs += observation.upstreamMs;
            metrics.upstreamMaxMs = Math.max(metrics.upstreamMaxMs, observation.upstreamMs);
        }
    }

    function recordFailure(route, error) {
        const metrics = ensureRoute(route);
        metrics.requestCount += 1;
        metrics.errorCount += 1;
        metrics.lastSeenAt = now();
        metrics.lastErrorAt = metrics.lastSeenAt;
        metrics.lastErrorMessage = error instanceof Error ? error.message : "unknown_error";
    }

    function snapshot() {
        const generatedAt = now();
        const routeSnapshots = {};
        const totals = {
            requestCount: 0,
            successCount: 0,
            errorCount: 0,
            cacheHits: 0,
            cacheMisses: 0,
            upstreamRequestCount: 0,
            upstreamTotalMs: 0,
            upstreamMaxMs: 0,
        };

        [...routes.entries()]
            .sort((left, right) => left[0].localeCompare(right[0]))
            .forEach(([route, metrics]) => {
                routeSnapshots[route] = createRouteMetricsSnapshot(metrics);
                totals.requestCount += metrics.requestCount;
                totals.successCount += metrics.successCount;
                totals.errorCount += metrics.errorCount;
                totals.cacheHits += metrics.cacheHits;
                totals.cacheMisses += metrics.cacheMisses;
                totals.upstreamRequestCount += metrics.upstreamCount;
                totals.upstreamTotalMs += metrics.upstreamTotalMs;
                totals.upstreamMaxMs = Math.max(totals.upstreamMaxMs, metrics.upstreamMaxMs);
            });

        const cacheTotal = totals.cacheHits + totals.cacheMisses;
        return {
            startedAt,
            generatedAt,
            uptimeMs: Math.max(0, generatedAt - startedAt),
            totals: {
                requestCount: totals.requestCount,
                successCount: totals.successCount,
                errorCount: totals.errorCount,
                cacheHits: totals.cacheHits,
                cacheMisses: totals.cacheMisses,
                cacheHitRate: cacheTotal > 0 ? Number((totals.cacheHits / cacheTotal).toFixed(4)) : null,
                upstreamRequestCount: totals.upstreamRequestCount,
                upstreamAverageMs:
                    totals.upstreamRequestCount > 0
                        ? Math.round(totals.upstreamTotalMs / totals.upstreamRequestCount)
                        : null,
                upstreamMaxMs: totals.upstreamMaxMs || null,
            },
            routes: routeSnapshots,
        };
    }

    function reset() {
        routes.clear();
    }

    return {
        recordFailure,
        recordSuccess,
        reset,
        snapshot,
    };
}

module.exports = {
    createAiMetricsStore,
};
