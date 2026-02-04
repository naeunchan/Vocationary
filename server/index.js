/* eslint-env node */
/* global __dirname, Buffer */

const path = require("path");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { OpenAI } = require("openai");

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
const REQUIRE_FIREBASE_ID_TOKEN = process.env.REQUIRE_FIREBASE_ID_TOKEN === "1";
const FIREBASE_CLIENT_IDS = (process.env.FIREBASE_CLIENT_IDS || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

const app = express();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const corsOrigins = (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
const isProduction = process.env.NODE_ENV === "production";

app.use(
    cors({
        origin: corsOrigins.length ? corsOrigins : isProduction ? false : "*",
        optionsSuccessStatus: 200,
    }),
);

app.use(express.json({ limit: "1mb" }));

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
        return res.status(503).json({ message: "AI proxy missing server API key (AI_PROXY_KEY)." });
    }
    const headerKey = req.headers["x-api-key"];
    if (headerKey !== API_KEY) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    next();
}

async function verifyFirebaseIdToken(idToken) {
    if (!REQUIRE_FIREBASE_ID_TOKEN) return true;
    if (!idToken) return false;
    try {
        const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`;
        const response = await fetch(url, { method: "GET" });
        if (!response.ok) return false;
        const data = await response.json();
        if (!data?.aud) return false;
        if (FIREBASE_CLIENT_IDS.length === 0) return true;
        return FIREBASE_CLIENT_IDS.includes(String(data.aud));
    } catch {
        return false;
    }
}

async function requireFirebaseIdToken(req, res, next) {
    if (!REQUIRE_FIREBASE_ID_TOKEN) {
        return next();
    }
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7).trim() : req.headers["x-firebase-id-token"];
    const ok = await verifyFirebaseIdToken(token);
    if (!ok) {
        return res.status(401).json({ message: "Unauthorized (Firebase token required)." });
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
                    required: ["meaningIndex", "definitionIndex", "example", "translatedDefinition"],
                    properties: {
                        meaningIndex: { type: "integer" },
                        definitionIndex: { type: "integer" },
                        example: { type: "string" },
                        translatedDefinition: { type: ["string", "null"] },
                    },
                },
            },
        },
        required: ["items"],
    },
    strict: true,
};

function clampTokens(value, fallback) {
    const num = Number(value);
    if (!Number.isFinite(num)) return fallback;
    return Math.min(400, Math.max(80, Math.round(num)));
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
            translatedDefinition:
                typeof item.translatedDefinition === "string" ? item.translatedDefinition.trim() : null,
        }))
        .filter((item) => item.example);
}

app.get("/health", (_req, res) => {
    res.json({ status: openai.apiKey ? "ok" : "unconfigured" });
});

app.post("/dictionary/examples", rateLimit, requireApiKey, requireFirebaseIdToken, async (req, res) => {
    if (!ensureApiKey(res)) return;

    const prompt = typeof req.body?.prompt === "string" ? req.body.prompt : "";
    const descriptors = Array.isArray(req.body?.descriptors) ? req.body.descriptors : [];
    if (!prompt || descriptors.length === 0) {
        return res.status(400).json({ message: "prompt와 descriptors가 필요해요." });
    }

    const schema = typeof req.body?.schema === "object" && req.body.schema ? req.body.schema : EXAMPLE_SCHEMA;
    const maxTokens = clampTokens(req.body?.maxTokens, 240);

    try {
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

        const content = completion.choices?.[0]?.message?.content ?? "";
        const raw = content ? JSON.parse(content) : { items: [] };
        const items = normalizeItems(raw);

        return res.json({ items });
    } catch (error) {
        console.error("Failed to generate dictionary examples", error);
        return res.status(500).json({ message: "예문을 생성하지 못했어요." });
    }
});

app.post("/dictionary/tts", rateLimit, requireApiKey, requireFirebaseIdToken, async (req, res) => {
    if (!ensureApiKey(res)) return;

    const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
    if (!text) {
        return res.status(400).json({ message: "text가 필요해요." });
    }

    const model = typeof req.body?.model === "string" && req.body.model.trim() ? req.body.model.trim() : TTS_MODEL;
    const voice = typeof req.body?.voice === "string" && req.body.voice.trim() ? req.body.voice.trim() : TTS_VOICE;
    const format = typeof req.body?.format === "string" && req.body.format.trim() ? req.body.format.trim() : TTS_FORMAT;

    try {
        const audio = await openai.audio.speech.create({
            model,
            voice,
            input: text,
            format,
        });

        const buffer = Buffer.from(await audio.arrayBuffer());
        return res.json({
            audioBase64: buffer.toString("base64"),
            audioUrl: null,
        });
    } catch (error) {
        console.error("Failed to synthesize audio", error);
        return res.status(500).json({ message: "발음 오디오를 준비하지 못했어요." });
    }
});

app.listen(PORT, () => {
    console.log(`AI proxy listening on port ${PORT}`);
});
