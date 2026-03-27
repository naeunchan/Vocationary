const DEFAULT_ROUTE_THRESHOLDS = {
    "/dictionary/examples": {
        minRequests: 3,
        maxErrorRate: 0.15,
        minCacheHitRate: 0.2,
        maxUpstreamAverageMs: 2500,
    },
    "/dictionary/tts": {
        minRequests: 3,
        maxErrorRate: 0.15,
        minCacheHitRate: 0.35,
        maxUpstreamAverageMs: 2200,
    },
    "/study/cards": {
        minRequests: 2,
        maxErrorRate: 0.2,
        minCacheHitRate: 0.1,
        maxUpstreamAverageMs: 3500,
    },
};

function clean(value) {
    return typeof value === "string" ? value.trim() : "";
}

function normalizeRouteThresholds(value) {
    if (!value || typeof value !== "object") {
        return {};
    }

    const thresholds = {};
    for (const [route, rawThreshold] of Object.entries(value)) {
        if (!route || !rawThreshold || typeof rawThreshold !== "object") {
            continue;
        }

        const minRequests = Number(rawThreshold.minRequests);
        const maxErrorRate = Number(rawThreshold.maxErrorRate);
        const minCacheHitRate = Number(rawThreshold.minCacheHitRate);
        const maxUpstreamAverageMs = Number(rawThreshold.maxUpstreamAverageMs);

        const nextThreshold = {};

        if (Number.isFinite(minRequests)) {
            nextThreshold.minRequests = Math.max(1, Math.round(minRequests));
        }
        if (Number.isFinite(maxErrorRate)) {
            nextThreshold.maxErrorRate = Math.max(0, maxErrorRate);
        }
        if (Number.isFinite(minCacheHitRate)) {
            nextThreshold.minCacheHitRate = Math.max(0, minCacheHitRate);
        }
        if (Number.isFinite(maxUpstreamAverageMs)) {
            nextThreshold.maxUpstreamAverageMs = Math.max(0, maxUpstreamAverageMs);
        }

        thresholds[route] = nextThreshold;
    }

    return thresholds;
}

function parseThresholdOverrides(rawValue) {
    const normalized = clean(rawValue);
    if (!normalized) {
        return {};
    }

    return normalizeRouteThresholds(JSON.parse(normalized));
}

function buildRouteThresholds(rawValue) {
    const overrides = parseThresholdOverrides(rawValue);
    const routes = new Set([...Object.keys(DEFAULT_ROUTE_THRESHOLDS), ...Object.keys(overrides)]);
    const thresholds = {};

    for (const route of routes) {
        thresholds[route] = {
            ...(DEFAULT_ROUTE_THRESHOLDS[route] ?? {}),
            ...(overrides[route] ?? {}),
        };
    }

    return thresholds;
}

function percent(value) {
    return `${(value * 100).toFixed(1)}%`;
}

function evaluateAiMetricsSnapshot(snapshot, routeThresholds) {
    const errors = [];
    const warnings = [];
    const info = [];

    const routes = snapshot?.routes && typeof snapshot.routes === "object" ? snapshot.routes : {};

    for (const [route, threshold] of Object.entries(routeThresholds)) {
        const metrics = routes[route];
        if (!metrics) {
            warnings.push(`${route}: no metrics observed yet.`);
            continue;
        }

        const requestCount = Number(metrics.requestCount) || 0;
        const errorCount = Number(metrics.errorCount) || 0;
        const upstreamAverageMs = Number(metrics.upstreamAverageMs);
        const cacheHitRate =
            typeof metrics.cacheHitRate === "number" && Number.isFinite(metrics.cacheHitRate)
                ? metrics.cacheHitRate
                : null;

        if (requestCount < threshold.minRequests) {
            info.push(`${route}: sample too small (${requestCount}/${threshold.minRequests}).`);
            continue;
        }

        const errorRate = requestCount > 0 ? errorCount / requestCount : 0;
        if (typeof threshold.maxErrorRate === "number" && errorRate > threshold.maxErrorRate) {
            errors.push(
                `${route}: error rate ${percent(errorRate)} exceeded ${percent(threshold.maxErrorRate)} (${errorCount}/${requestCount}).`,
            );
        }

        if (
            typeof threshold.maxUpstreamAverageMs === "number" &&
            Number.isFinite(upstreamAverageMs) &&
            upstreamAverageMs > threshold.maxUpstreamAverageMs
        ) {
            errors.push(
                `${route}: upstream average ${upstreamAverageMs}ms exceeded ${threshold.maxUpstreamAverageMs}ms.`,
            );
        }

        if (
            typeof threshold.minCacheHitRate === "number" &&
            cacheHitRate !== null &&
            cacheHitRate < threshold.minCacheHitRate
        ) {
            warnings.push(
                `${route}: cache hit rate ${percent(cacheHitRate)} is below ${percent(threshold.minCacheHitRate)}.`,
            );
        }
    }

    return {
        errors,
        warnings,
        info,
    };
}

function resolveMetricsUrl(env) {
    const explicit = clean(env.AI_METRICS_URL);
    if (explicit) {
        return explicit;
    }

    const proxyUrl = clean(env.EXPO_PUBLIC_OPENAI_PROXY_URL);
    if (!proxyUrl) {
        return "";
    }

    return `${proxyUrl.replace(/\/+$/, "")}/metrics`;
}

function resolveMetricsApiKey(env) {
    return clean(env.AI_METRICS_API_KEY) || clean(env.AI_PROXY_KEY) || clean(env.EXPO_PUBLIC_OPENAI_PROXY_KEY);
}

module.exports = {
    DEFAULT_ROUTE_THRESHOLDS,
    buildRouteThresholds,
    evaluateAiMetricsSnapshot,
    parseThresholdOverrides,
    resolveMetricsApiKey,
    resolveMetricsUrl,
};
