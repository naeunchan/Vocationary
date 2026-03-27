/* eslint-env node */
/* global __dirname, Buffer */

const path = require("path");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { OpenAI } = require("openai");
const { createAiResponseCache } = require("./aiResponseCache");
const { logAiRouteMetrics } = require("./aiRouteMetrics");
const { createCorsOriginResolver, getAllowedCorsOrigins } = require("./corsConfig");
const { buildStudyPrompt, SUPPORTED_CARD_TYPES } = require("./studyPrompt");
const { buildTtsAssetToken, buildTtsAssetUrl } = require("./ttsAsset");

// Load env values from both project root and server folder (server/.env overrides).
dotenv.config({ path: path.resolve(__dirname, "..", ".env") });
dotenv.config({ path: path.resolve(__dirname, ".env"), override: true });

const PORT = Number(process.env.PORT) || 4000;
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const TTS_MODEL = process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts";
const TTS_VOICE = process.env.OPENAI_TTS_VOICE || "alloy";
const TTS_FORMAT = process.env.OPENAI_TTS_FORMAT || "mp3";
const API_KEY = process.env.AI_PROXY_KEY || "";
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 60;
const AI_HEALTH_DEGRADED_WINDOW_MS = Number(process.env.AI_HEALTH_DEGRADED_WINDOW_MS) || 10 * 60 * 1000;
const AI_EXAMPLES_CACHE_TTL_MS = Number(process.env.AI_EXAMPLES_CACHE_TTL_MS) || 30 * 60 * 1000;
const AI_EXAMPLES_CACHE_MAX = Number(process.env.AI_EXAMPLES_CACHE_MAX) || 500;
const AI_TTS_CACHE_TTL_MS = Number(process.env.AI_TTS_CACHE_TTL_MS) || 24 * 60 * 60 * 1000;
const AI_TTS_CACHE_MAX = Number(process.env.AI_TTS_CACHE_MAX) || 200;
const AI_STUDY_CACHE_TTL_MS = Number(process.env.AI_STUDY_CACHE_TTL_MS) || 30 * 60 * 1000;
const AI_STUDY_CACHE_MAX = Number(process.env.AI_STUDY_CACHE_MAX) || 300;

const app = express();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const exampleResponseCache = createAiResponseCache({ maxEntries: AI_EXAMPLES_CACHE_MAX });
const ttsResponseCache = createAiResponseCache({ maxEntries: AI_TTS_CACHE_MAX });
const ttsAssetCache = createAiResponseCache({ maxEntries: AI_TTS_CACHE_MAX });
const studyCardResponseCache = createAiResponseCache({ maxEntries: AI_STUDY_CACHE_MAX });
const aiRuntimeHealth = {
    lastSuccessAt: 0,
    lastFailureAt: 0,
    lastFailureRoute: null,
    lastFailureMessage: null,
};

const isProduction = process.env.NODE_ENV === "production";
const allowedCorsOrigins = getAllowedCorsOrigins({
    configuredOrigins: process.env.CORS_ORIGINS,
    appName: process.env.AIT_APP_NAME,
});

app.use(
    cors({
        origin: createCorsOriginResolver({
            allowedOrigins: allowedCorsOrigins,
            isProduction,
        }),
        optionsSuccessStatus: 200,
    }),
);

if (allowedCorsOrigins.length > 0) {
    console.log(`[CORS] Allowing browser origins: ${allowedCorsOrigins.join(", ")}`);
} else if (isProduction) {
    console.warn("[CORS] No allowed browser origins configured. Set AIT_APP_NAME or CORS_ORIGINS before release.");
} else {
    console.log("[CORS] Development mode with no allowlist. Any browser origin is allowed.");
}

app.use(express.json({ limit: "1mb" }));

app.use((req, res, next) => {
    const startedAt = Date.now();
    res.on("finish", () => {
        const elapsed = Date.now() - startedAt;
        console.log(`[REQ] ${req.method} ${req.path} -> ${res.statusCode} (${elapsed}ms)`);
    });
    next();
});

// Basic in-memory rate limiting to prevent accidental abuse
const requestLog = new Map();
function rateLimit(req, res, next) {
    const key = req.ip || req.headers["x-forwarded-for"] || "global";
    const now = Date.now();
    const windowStart = now - RATE_LIMIT_WINDOW_MS;
    const history = (requestLog.get(key) || []).filter((ts) => ts > windowStart);
    if (history.length >= RATE_LIMIT_MAX) {
        return res.status(429).json({ message: "Too many requests. Please try again in a moment." });
    }
    history.push(now);
    requestLog.set(key, history);
    next();
}

function requireApiKey(req, res, next) {
    if (!API_KEY) {
        console.warn("[AUTH] AI_PROXY_KEY is missing on server");
        return res.status(503).json({ message: "AI proxy missing server API key (AI_PROXY_KEY)." });
    }
    const headerKey = req.headers["x-api-key"];
    if (headerKey !== API_KEY) {
        console.warn("[AUTH] invalid x-api-key");
        return res.status(401).json({ message: "Unauthorized" });
    }
    next();
}

const EXAMPLE_SCHEMA = {
    name: "dictionary_examples",
    schema: {
        type: "object",
        additionalProperties: false,
        properties: {
            items: {
                type: "array",
                items: {
                    type: "object",
                    additionalProperties: false,
                    required: [
                        "meaningIndex",
                        "definitionIndex",
                        "example",
                        "translatedExample",
                        "translatedDefinition",
                    ],
                    properties: {
                        meaningIndex: { type: "integer" },
                        definitionIndex: { type: "integer" },
                        example: { type: "string" },
                        translatedExample: { type: ["string", "null"] },
                        translatedDefinition: { type: ["string", "null"] },
                    },
                },
            },
        },
        required: ["items"],
    },
    strict: true,
};

const STUDY_CARD_SCHEMA = {
    name: "study_cards",
    schema: {
        type: "object",
        additionalProperties: false,
        properties: {
            cards: {
                type: "array",
                items: {
                    type: "object",
                    additionalProperties: false,
                    required: ["id", "type", "prompt", "choices", "answer"],
                    properties: {
                        id: { type: "string" },
                        type: {
                            type: "string",
                            enum: SUPPORTED_CARD_TYPES,
                        },
                        prompt: { type: "string" },
                        answer: { type: "string" },
                        explanation: { type: ["string", "null"] },
                        choices: {
                            type: "array",
                            minItems: 2,
                            items: {
                                type: "object",
                                additionalProperties: false,
                                required: ["id", "label", "value"],
                                properties: {
                                    id: { type: "string" },
                                    label: { type: "string" },
                                    value: { type: "string" },
                                },
                            },
                        },
                    },
                },
            },
        },
        required: ["cards"],
    },
    strict: true,
};

function clampTokens(value, fallback) {
    const num = Number(value);
    if (!Number.isFinite(num)) return fallback;
    return Math.min(400, Math.max(80, Math.round(num)));
}

function normalizeText(value) {
    return typeof value === "string" ? value.trim() : "";
}

function normalizeDescriptors(value) {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .map((descriptor) => ({
            meaningIndex: Number(descriptor?.meaningIndex),
            definitionIndex: Number(descriptor?.definitionIndex),
            definition: normalizeText(descriptor?.definition),
            needsExample: Boolean(descriptor?.needsExample),
            needsTranslation: Boolean(descriptor?.needsTranslation),
        }))
        .filter(
            (descriptor) =>
                Number.isInteger(descriptor.meaningIndex) &&
                Number.isInteger(descriptor.definitionIndex) &&
                descriptor.definition,
        );
}

function normalizeStudyContext(value) {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .map((entry) => ({
            definition: normalizeText(entry?.definition),
            example: normalizeText(entry?.example) || null,
            partOfSpeech: normalizeText(entry?.partOfSpeech) || null,
        }))
        .filter((entry) => entry.definition);
}

function buildExamplesCacheKey({ prompt, descriptors, maxTokens }) {
    return JSON.stringify({
        prompt: normalizeText(prompt),
        descriptors: normalizeDescriptors(descriptors),
        maxTokens,
        model: MODEL,
    });
}

function buildTtsCacheKey({ text, model, voice, format }) {
    return JSON.stringify({
        text: normalizeText(text),
        model: normalizeText(model),
        voice: normalizeText(voice),
        format: normalizeText(format),
    });
}

function buildStudyCardsCacheKey({ word, context, cardTypes, cardCount, maxTokens }) {
    return JSON.stringify({
        word: normalizeText(word).toLowerCase(),
        context: normalizeStudyContext(context),
        cardTypes: Array.isArray(cardTypes) ? [...cardTypes].map((entry) => normalizeText(entry)).sort() : [],
        cardCount,
        maxTokens,
        model: MODEL,
    });
}

function ensureApiKey(res) {
    if (!openai.apiKey) {
        res.status(503).json({ message: "OpenAI API key is missing. Set OPENAI_API_KEY on the server." });
        return false;
    }
    return true;
}

function normalizeItems(payload) {
    if (!payload || typeof payload !== "object" || !Array.isArray(payload.items)) {
        return [];
    }

    return payload.items
        .map((item) => ({
            meaningIndex: Number(item.meaningIndex),
            definitionIndex: Number(item.definitionIndex),
            example: typeof item.example === "string" ? item.example.trim() : "",
            translatedExample: typeof item.translatedExample === "string" ? item.translatedExample.trim() : null,
            translatedDefinition:
                typeof item.translatedDefinition === "string" ? item.translatedDefinition.trim() : null,
        }))
        .filter((item) => item.example);
}

function normalizeStudyCards(payload) {
    if (!payload || typeof payload !== "object" || !Array.isArray(payload.cards)) {
        return [];
    }

    return payload.cards
        .map((card, index) => {
            const type = typeof card.type === "string" ? card.type.trim() : "";
            const prompt = typeof card.prompt === "string" ? card.prompt.trim() : "";
            const answer = typeof card.answer === "string" ? card.answer.trim() : "";
            const explanation = typeof card.explanation === "string" ? card.explanation.trim() : null;

            if (!SUPPORTED_CARD_TYPES.includes(type) || !prompt || !answer || !Array.isArray(card.choices)) {
                return null;
            }

            const choices = card.choices
                .map((choice, choiceIndex) => {
                    const label = typeof choice.label === "string" ? choice.label.trim() : "";
                    const value = typeof choice.value === "string" ? choice.value.trim() : "";
                    if (!label || !value) {
                        return null;
                    }

                    return {
                        id:
                            typeof choice.id === "string" && choice.id.trim()
                                ? choice.id.trim()
                                : `choice-${choiceIndex + 1}`,
                        label,
                        value,
                    };
                })
                .filter(Boolean);

            if (choices.length < 2) {
                return null;
            }

            return {
                id: typeof card.id === "string" && card.id.trim() ? card.id.trim() : `${type}-${index + 1}`,
                type,
                prompt,
                answer,
                explanation,
                choices,
            };
        })
        .filter(Boolean);
}

function markAiSuccess() {
    aiRuntimeHealth.lastSuccessAt = Date.now();
}

function markAiFailure(route, error) {
    aiRuntimeHealth.lastFailureAt = Date.now();
    aiRuntimeHealth.lastFailureRoute = route;
    aiRuntimeHealth.lastFailureMessage = error instanceof Error ? error.message : "unknown_error";
}

function getAiRuntimeHealthStatus() {
    const now = Date.now();
    const hasRecentFailure =
        aiRuntimeHealth.lastFailureAt > 0 && now - aiRuntimeHealth.lastFailureAt <= AI_HEALTH_DEGRADED_WINDOW_MS;
    const isFailureNewerThanSuccess = aiRuntimeHealth.lastFailureAt > aiRuntimeHealth.lastSuccessAt;

    if (hasRecentFailure && isFailureNewerThanSuccess) {
        return {
            status: "degraded",
            lastSuccessAt: aiRuntimeHealth.lastSuccessAt || null,
            lastFailureAt: aiRuntimeHealth.lastFailureAt || null,
            lastFailureRoute: aiRuntimeHealth.lastFailureRoute,
            lastFailureMessage: aiRuntimeHealth.lastFailureMessage,
        };
    }

    return {
        status: "ok",
        lastSuccessAt: aiRuntimeHealth.lastSuccessAt || null,
        lastFailureAt: aiRuntimeHealth.lastFailureAt || null,
    };
}

app.get("/health", (_req, res) => {
    if (!openai.apiKey) {
        return res.json({ status: "unconfigured" });
    }
    return res.json(getAiRuntimeHealthStatus());
});

app.post("/dictionary/examples", rateLimit, requireApiKey, async (req, res) => {
    if (!ensureApiKey(res)) return;

    const prompt = typeof req.body?.prompt === "string" ? req.body.prompt : "";
    const descriptors = Array.isArray(req.body?.descriptors) ? req.body.descriptors : [];
    if (!prompt || descriptors.length === 0) {
        return res.status(400).json({ message: "prompt와 descriptors가 필요해요." });
    }

    const schema = typeof req.body?.schema === "object" && req.body.schema ? req.body.schema : EXAMPLE_SCHEMA;
    const maxTokens = clampTokens(req.body?.maxTokens, 240);
    const cacheKey = buildExamplesCacheKey({ prompt, descriptors, maxTokens });

    try {
        let upstreamMs = null;
        const { value: items, cacheHit } = await exampleResponseCache.getOrCreate(
            cacheKey,
            async () => {
                const upstreamStartedAt = Date.now();
                const completion = await openai.chat.completions.create({
                    model: MODEL,
                    messages: [
                        {
                            role: "system",
                            content:
                                "You generate concise dictionary examples. Respond ONLY with JSON that matches the provided schema.",
                        },
                        { role: "user", content: prompt },
                    ],
                    response_format: { type: "json_schema", json_schema: schema },
                    max_tokens: maxTokens,
                });
                upstreamMs = Date.now() - upstreamStartedAt;

                const content = completion.choices?.[0]?.message?.content ?? "";
                const raw = content ? JSON.parse(content) : { items: [] };
                return normalizeItems(raw);
            },
            { ttlMs: AI_EXAMPLES_CACHE_TTL_MS },
        );
        markAiSuccess();
        logAiRouteMetrics("/dictionary/examples", {
            cache: cacheHit ? "hit" : "miss",
            upstreamMs,
            promptChars: prompt.length,
            descriptorCount: descriptors.length,
            itemCount: items.length,
            maxTokens,
        });

        return res.json({ items });
    } catch (error) {
        console.error("Failed to generate dictionary examples", error);
        markAiFailure("/dictionary/examples", error);
        return res.status(500).json({ message: "예문을 생성하지 못했어요." });
    }
});

app.post("/dictionary/tts", rateLimit, requireApiKey, async (req, res) => {
    if (!ensureApiKey(res)) return;

    const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
    if (!text) {
        return res.status(400).json({ message: "text가 필요해요." });
    }

    const model = typeof req.body?.model === "string" && req.body.model.trim() ? req.body.model.trim() : TTS_MODEL;
    const voice = typeof req.body?.voice === "string" && req.body.voice.trim() ? req.body.voice.trim() : TTS_VOICE;
    const format = typeof req.body?.format === "string" && req.body.format.trim() ? req.body.format.trim() : TTS_FORMAT;
    const cacheKey = buildTtsCacheKey({ text, model, voice, format });

    try {
        let upstreamMs = null;
        const { value: asset, cacheHit } = await ttsResponseCache.getOrCreate(
            cacheKey,
            async () => {
                const upstreamStartedAt = Date.now();
                const audio = await openai.audio.speech.create({
                    model,
                    voice,
                    input: text,
                    format,
                });

                const buffer = Buffer.from(await audio.arrayBuffer());
                upstreamMs = Date.now() - upstreamStartedAt;
                const token = buildTtsAssetToken(cacheKey, process.env.OPENAI_API_KEY);
                return {
                    token,
                    format,
                    contentType: `audio/${format}`,
                    audioBase64: buffer.toString("base64"),
                };
            },
            { ttlMs: AI_TTS_CACHE_TTL_MS },
        );
        ttsAssetCache.set(
            asset.token,
            {
                audioBase64: asset.audioBase64,
                contentType: asset.contentType,
            },
            AI_TTS_CACHE_TTL_MS,
        );
        markAiSuccess();
        logAiRouteMetrics("/dictionary/tts", {
            cache: cacheHit ? "hit" : "miss",
            upstreamMs,
            textChars: text.length,
            format,
            base64Chars: asset.audioBase64.length,
        });
        return res.json({
            audioBase64: null,
            audioUrl: buildTtsAssetUrl(req, asset.token, PORT),
        });
    } catch (error) {
        console.error("Failed to synthesize audio", error);
        markAiFailure("/dictionary/tts", error);
        return res.status(500).json({ message: "발음 오디오를 준비하지 못했어요." });
    }
});

app.get("/dictionary/tts/:token", (req, res) => {
    const token = normalizeText(req.params?.token);
    if (!token) {
        return res.status(404).end();
    }

    const asset = ttsAssetCache.get(token);
    if (!asset?.audioBase64 || !asset?.contentType) {
        return res.status(404).end();
    }

    res.setHeader("Content-Type", asset.contentType);
    res.setHeader("Cache-Control", "public, max-age=86400, immutable");
    return res.send(Buffer.from(asset.audioBase64, "base64"));
});

app.post("/study/cards", rateLimit, requireApiKey, async (req, res) => {
    if (!ensureApiKey(res)) return;

    const word = typeof req.body?.word === "string" ? req.body.word.trim() : "";
    const context = Array.isArray(req.body?.context) ? req.body.context : [];
    const cardTypes = Array.isArray(req.body?.cardTypes) ? req.body.cardTypes : [];
    const cardCount = Math.min(6, Math.max(1, Math.round(Number(req.body?.cardCount) || 3)));

    if (!word || context.length === 0) {
        return res.status(400).json({ message: "word와 context가 필요해요." });
    }

    const maxTokens = clampTokens(req.body?.maxTokens, 280);
    const cacheKey = buildStudyCardsCacheKey({
        word,
        context,
        cardTypes,
        cardCount,
        maxTokens,
    });

    try {
        let promptChars = null;
        let upstreamMs = null;
        const { value: cards, cacheHit } = await studyCardResponseCache.getOrCreate(
            cacheKey,
            async () => {
                const prompt = buildStudyPrompt({
                    word,
                    context,
                    cardTypes,
                    cardCount,
                });
                promptChars = prompt.length;
                const upstreamStartedAt = Date.now();
                const completion = await openai.chat.completions.create({
                    model: MODEL,
                    messages: [
                        {
                            role: "system",
                            content:
                                "You generate objective vocabulary study cards. Respond ONLY with JSON that matches the provided schema.",
                        },
                        { role: "user", content: prompt },
                    ],
                    response_format: { type: "json_schema", json_schema: STUDY_CARD_SCHEMA },
                    max_tokens: maxTokens,
                });
                upstreamMs = Date.now() - upstreamStartedAt;

                const content = completion.choices?.[0]?.message?.content ?? "";
                const raw = content ? JSON.parse(content) : { cards: [] };
                const cards = normalizeStudyCards(raw);
                if (cards.length === 0) {
                    throw new Error("empty_cards");
                }

                return cards;
            },
            { ttlMs: AI_STUDY_CACHE_TTL_MS },
        );

        markAiSuccess();
        logAiRouteMetrics("/study/cards", {
            cache: cacheHit ? "hit" : "miss",
            upstreamMs,
            wordChars: word.length,
            contextCount: context.length,
            cardTypeCount: cardTypes.length,
            requestedCardCount: cardCount,
            cardCount: cards.length,
            promptChars,
            maxTokens,
        });
        return res.json({ cards });
    } catch (error) {
        console.error("Failed to generate study cards", error);
        markAiFailure("/study/cards", error);
        return res.status(500).json({ message: "학습 카드를 준비하지 못했어요." });
    }
});

app.listen(PORT, () => {
    console.log(`AI proxy listening on port ${PORT}`);
});
