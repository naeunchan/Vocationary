const crypto = require("crypto");

function normalizeText(value) {
    return typeof value === "string" ? value.trim() : "";
}

function buildTtsAssetToken(cacheKey, secret) {
    return crypto
        .createHash("sha256")
        .update(`vocachip-tts:${cacheKey}:${secret || "fallback"}`)
        .digest("hex")
        .slice(0, 32);
}

function buildPublicBaseUrl(req, fallbackPort) {
    const forwardedProto = normalizeText(req.headers?.["x-forwarded-proto"]);
    const forwardedHost = normalizeText(req.headers?.["x-forwarded-host"]);
    const protocol = forwardedProto || req.protocol || "http";
    const host =
        forwardedHost ||
        (typeof req.get === "function" ? normalizeText(req.get("host")) : "") ||
        `localhost:${fallbackPort}`;
    return `${protocol}://${host}`;
}

function buildTtsAssetUrl(req, token, fallbackPort) {
    return `${buildPublicBaseUrl(req, fallbackPort)}/dictionary/tts/${token}`;
}

module.exports = {
    buildPublicBaseUrl,
    buildTtsAssetToken,
    buildTtsAssetUrl,
};
