#!/usr/bin/env node
/* eslint-env node */
/* global AbortController */

const {
    buildRouteThresholds,
    evaluateAiMetricsSnapshot,
    resolveMetricsApiKey,
    resolveMetricsUrl,
} = require("../../server/aiMetricsMonitor");

function clean(value) {
    return typeof value === "string" ? value.trim() : "";
}

function printSection(title, items) {
    if (!items.length) {
        return;
    }

    console.log(`\n${title}`);
    for (const item of items) {
        console.log(`- ${item}`);
    }
}

async function main() {
    const metricsUrl = resolveMetricsUrl(process.env);
    if (!metricsUrl) {
        throw new Error("Set `AI_METRICS_URL` or `EXPO_PUBLIC_OPENAI_PROXY_URL` before running metrics checks.");
    }

    const apiKey = resolveMetricsApiKey(process.env);
    if (!apiKey) {
        throw new Error(
            "Set `AI_METRICS_API_KEY`, `AI_PROXY_KEY`, or `EXPO_PUBLIC_OPENAI_PROXY_KEY` before running metrics checks.",
        );
    }

    const timeoutMs = Math.max(1000, Number(process.env.AI_METRICS_TIMEOUT_MS) || 5000);
    const routeThresholds = buildRouteThresholds(process.env.AI_METRICS_THRESHOLDS_JSON);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
        controller.abort();
    }, timeoutMs);

    let response;
    try {
        response = await fetch(metricsUrl, {
            method: "GET",
            headers: {
                "x-api-key": apiKey,
            },
            signal: controller.signal,
        });
    } finally {
        clearTimeout(timeoutId);
    }

    if (!response.ok) {
        throw new Error(`Metrics request failed with status ${response.status}.`);
    }

    const snapshot = await response.json();
    const evaluation = evaluateAiMetricsSnapshot(snapshot, routeThresholds);

    console.log(`AI metrics snapshot: ${clean(new Date(snapshot.generatedAt || Date.now()).toISOString())}`);
    if (snapshot?.totals) {
        console.log(
            `Totals: requests=${snapshot.totals.requestCount ?? 0} errors=${snapshot.totals.errorCount ?? 0} cacheHitRate=${snapshot.totals.cacheHitRate ?? "n/a"} upstreamAvgMs=${snapshot.totals.upstreamAverageMs ?? "n/a"}`,
        );
    }

    printSection("Info", evaluation.info);
    printSection("Warnings", evaluation.warnings);

    if (evaluation.errors.length > 0) {
        printSection("Errors", evaluation.errors);
        console.error("\nAI metrics check failed.");
        process.exit(1);
    }

    console.log("\nAI metrics check passed.");
}

main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`AI metrics check failed: ${message}`);
    process.exit(1);
});
