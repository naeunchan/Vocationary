function buildAiRouteMetricsLog(route, metrics = {}) {
    const parts = [`[AI] ${route}`];

    Object.entries(metrics).forEach(([key, value]) => {
        if (value === null || value === undefined || value === "") {
            return;
        }

        parts.push(`${key}=${value}`);
    });

    return parts.join(" ");
}

function logAiRouteMetrics(route, metrics, logger = console.log) {
    logger(buildAiRouteMetricsLog(route, metrics));
}

module.exports = {
    buildAiRouteMetricsLog,
    logAiRouteMetrics,
};
