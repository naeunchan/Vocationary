#!/usr/bin/env node
/* eslint-env node */
/* global __dirname */

const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const rootDir = path.resolve(__dirname, "..", "..");

function readJson(filePath) {
    try {
        return JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch (error) {
        throw new Error(`Failed to read ${path.relative(rootDir, filePath)}: ${error.message}`);
    }
}

function clean(value) {
    return typeof value === "string" ? value.trim() : "";
}

function isPlaceholder(value) {
    const normalized = clean(value).toLowerCase();
    return (
        !normalized ||
        normalized === "example.com" ||
        normalized.includes("example.com") ||
        normalized.includes("replace-with") ||
        normalized.includes("placeholder") ||
        normalized === "todo"
    );
}

function isHttpsUrl(value) {
    const normalized = clean(value);
    if (!normalized) return false;

    try {
        const url = new URL(normalized);
        return url.protocol === "https:";
    } catch {
        return false;
    }
}

function parseBoolean(value) {
    const normalized = clean(value).toLowerCase();
    if (!normalized) return null;
    if (["1", "true", "on", "yes"].includes(normalized)) return true;
    if (["0", "false", "off", "no"].includes(normalized)) return false;
    return null;
}

function printSection(title, items) {
    if (!items.length) return;
    console.log(`\n${title}`);
    for (const item of items) {
        console.log(`- ${item}`);
    }
}

const errors = [];
const warnings = [];
const appJson = readJson(path.join(rootDir, "app.json"));
const expoConfig = appJson.expo ?? {};
const expoExtra = expoConfig.extra ?? {};

const appName = clean(process.env.AIT_APP_NAME);
const displayName = clean(process.env.AIT_DISPLAY_NAME);
const iconUrl = clean(process.env.AIT_APP_ICON_URL);
const privacyPolicyUrl = clean(expoExtra.privacyPolicyUrl);
const termsOfServiceUrl = clean(expoExtra.termsOfServiceUrl);
const profile = clean(process.env.APP_ENV || process.env.NODE_ENV).toLowerCase();
const isProduction = profile === "production";
const accountAuthRaw = process.env.EXPO_PUBLIC_FEATURE_ACCOUNT_AUTH;
const accountAuthFlag = parseBoolean(accountAuthRaw);
const openAIProxyUrl = clean(process.env.EXPO_PUBLIC_OPENAI_PROXY_URL);
const openAIProxyKey = clean(process.env.EXPO_PUBLIC_OPENAI_PROXY_KEY);
const aiHealthUrl = clean(process.env.EXPO_PUBLIC_AI_HEALTH_URL);

if (isPlaceholder(appName)) {
    errors.push("Set `AIT_APP_NAME` to the real Apps in Toss app name before building release artifacts.");
}

if (isPlaceholder(displayName)) {
    errors.push("Set `AIT_DISPLAY_NAME` to the real release display name before building release artifacts.");
}

if (!isHttpsUrl(iconUrl) || isPlaceholder(iconUrl)) {
    errors.push("Set `AIT_APP_ICON_URL` to a real hosted HTTPS icon URL before building release artifacts.");
}

if (!isHttpsUrl(privacyPolicyUrl) || isPlaceholder(privacyPolicyUrl)) {
    errors.push("Set `app.json -> expo.extra.privacyPolicyUrl` to a real hosted HTTPS URL before release.");
}

if (!isHttpsUrl(termsOfServiceUrl) || isPlaceholder(termsOfServiceUrl)) {
    errors.push("Set `app.json -> expo.extra.termsOfServiceUrl` to a real hosted HTTPS URL before release.");
}

if (isProduction) {
    if (accountAuthFlag === null) {
        errors.push("Set `EXPO_PUBLIC_FEATURE_ACCOUNT_AUTH` explicitly to `true` or `false` for production releases.");
    }
} else if (accountAuthFlag === null && clean(accountAuthRaw)) {
    errors.push("`EXPO_PUBLIC_FEATURE_ACCOUNT_AUTH` must be `true` or `false` when it is provided.");
}

const aiConfiguredFields = [openAIProxyUrl, openAIProxyKey, aiHealthUrl].filter(Boolean).length;
const hasOnlyPartialProxyConfig =
    Boolean(openAIProxyUrl) !== Boolean(openAIProxyKey) ||
    (Boolean(aiHealthUrl) && (!openAIProxyUrl || !openAIProxyKey));

if (aiConfiguredFields > 0 && hasOnlyPartialProxyConfig) {
    warnings.push(
        "AI proxy config looks partial. Prefer setting `EXPO_PUBLIC_OPENAI_PROXY_URL`, `EXPO_PUBLIC_OPENAI_PROXY_KEY`, and `EXPO_PUBLIC_AI_HEALTH_URL` together.",
    );
}

if (warnings.length) {
    printSection("Warnings", warnings);
}

if (errors.length) {
    printSection("Errors", errors);
    console.error("\nRelease readiness check failed.");
    process.exit(1);
}

console.log("Release readiness check passed.");
