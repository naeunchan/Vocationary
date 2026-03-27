import QuickLRU from "quick-lru";

import { getPersistedExampleUpdates, setPersistedExampleUpdates } from "@/api/dictionary/aiPersistentCache";
import { createAIHttpError, createAIInvalidPayloadError, normalizeAIProxyError } from "@/api/dictionary/aiProxyError";
import { OPENAI_FEATURE_ENABLED, OPENAI_PROXY_KEY, OPENAI_PROXY_URL } from "@/config/openAI";
import { MeaningEntry } from "@/services/dictionary/types/WordResult";

export type ExampleUpdate = {
    meaningIndex: number;
    definitionIndex: number;
    example?: string;
    translatedExample?: string;
    translatedDefinition?: string;
};

type GenerateExampleOptions = {
    forceFresh?: boolean;
};

type CacheEntry = {
    expiresAt: number;
    value: ExampleUpdate[];
};

const EXAMPLE_CACHE_TTL_MS = 1000 * 60 * 30;
const exampleCache = new QuickLRU<string, CacheEntry>({ maxSize: 1000 });
const inFlightExampleRequests = new Map<string, Promise<ExampleUpdate[]>>();

type DefinitionDescriptor = {
    meaningIndex: number;
    definitionIndex: number;
    definition: string;
    needsExample: boolean;
    needsTranslation: boolean;
};

function collectDescriptors(meanings: MeaningEntry[], shouldTranslate: boolean): DefinitionDescriptor[] {
    const result: DefinitionDescriptor[] = [];
    for (let i = 0; i < meanings.length; i++) {
        const meaning = meanings[i];
        for (let j = 0; j < meaning.definitions.length; j++) {
            const def = meaning.definitions[j];
            const baseDef = def.originalDefinition ?? def.definition;
            if (!baseDef) continue;
            const needsExample = def.pendingExample ?? !def.example;
            const needsTranslation = shouldTranslate && (def.pendingTranslation ?? true);
            if (!needsExample && !needsTranslation) continue;

            result.push({
                meaningIndex: i,
                definitionIndex: j,
                definition: baseDef,
                needsExample,
                needsTranslation,
            });
        }
    }
    return result;
}

function buildPrompt(word: string, descriptors: DefinitionDescriptor[]): string {
    const hint = "Create concise English examples (<20 tokens).";

    const compactData = JSON.stringify(
        descriptors.map((d) => ({
            m: d.meaningIndex,
            d: d.definitionIndex,
            text: d.definition,
        })),
    );

    return `Word:${word}\n${hint}\nData:${compactData}\nOutput JSON:{items:[{meaningIndex,definitionIndex,example,translatedExample,translatedDefinition}]}`;
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
} as const;

function buildCacheKey(word: string, descriptors: DefinitionDescriptor[]): string {
    const signature = descriptors
        .map(
            ({ meaningIndex, definitionIndex, definition, needsExample, needsTranslation }) =>
                `${meaningIndex}:${definitionIndex}:${needsExample ? 1 : 0}:${needsTranslation ? 1 : 0}:${definition}`,
        )
        .join("|");
    return `${word.toLowerCase()}:${signature}`;
}

function parseCompletionContent(content: string | null | undefined): ExampleUpdate[] {
    if (!content) return [];
    try {
        const parsed = JSON.parse(content);
        if (!parsed?.items || !Array.isArray(parsed.items)) return [];
        return parsed.items.map((item: any) => ({
            meaningIndex: Number(item.meaningIndex),
            definitionIndex: Number(item.definitionIndex),
            example: typeof item.example === "string" ? item.example.trim() : undefined,
            translatedExample: typeof item.translatedExample === "string" ? item.translatedExample.trim() : undefined,
            translatedDefinition:
                typeof item.translatedDefinition === "string" ? item.translatedDefinition.trim() : undefined,
        }));
    } catch {
        return [];
    }
}

function maxOutputTokensFor(count: number): number {
    return Math.min(300, Math.max(80, count * 40));
}

function cloneExampleUpdates(updates: ExampleUpdate[]): ExampleUpdate[] {
    return updates.map((update) => ({ ...update }));
}

function peekCachedExampleUpdates(
    cacheKey: string,
    now = Date.now(),
): { isFresh: boolean; value: ExampleUpdate[] } | null {
    const cached = exampleCache.get(cacheKey);
    if (!cached) {
        return null;
    }

    return {
        isFresh: cached.expiresAt > now,
        value: cloneExampleUpdates(cached.value),
    };
}

function setCachedExampleUpdates(cacheKey: string, updates: ExampleUpdate[], now = Date.now()): ExampleUpdate[] {
    const value = cloneExampleUpdates(updates);
    exampleCache.set(cacheKey, {
        value,
        expiresAt: now + EXAMPLE_CACHE_TTL_MS,
    });
    return cloneExampleUpdates(value);
}

async function requestOpenAI(word: string, descriptors: DefinitionDescriptor[]): Promise<ExampleUpdate[]> {
    if (!OPENAI_FEATURE_ENABLED || !OPENAI_PROXY_URL) {
        return [];
    }

    const endpointBase = OPENAI_PROXY_URL.replace(/\/+$/, "");
    const requestUrl = `${endpointBase}/dictionary/examples`;
    const prompt = buildPrompt(word, descriptors);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
        controller.abort();
    }, 8000);

    try {
        const response = await fetch(requestUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(OPENAI_PROXY_KEY ? { "x-api-key": OPENAI_PROXY_KEY } : {}),
            },
            body: JSON.stringify({
                word,
                mode: "en-en",
                prompt,
                descriptors,
                schema: EXAMPLE_SCHEMA,
                maxTokens: maxOutputTokensFor(descriptors.length),
            }),
            signal: controller.signal,
        });

        if (!response.ok) {
            throw createAIHttpError(response.status, "examples");
        }

        let data: unknown;
        try {
            data = await response.json();
        } catch (error) {
            throw createAIInvalidPayloadError("examples", error);
        }

        const payload = (data ?? {}) as { items?: unknown };
        const items = Array.isArray(payload.items) ? payload.items : [];
        return parseCompletionContent(JSON.stringify({ items }));
    } catch (error) {
        throw normalizeAIProxyError(error, "examples");
    } finally {
        clearTimeout(timeoutId);
    }
}

async function loadFreshExampleUpdates(
    cacheKey: string,
    word: string,
    descriptors: DefinitionDescriptor[],
): Promise<ExampleUpdate[]> {
    const pending = inFlightExampleRequests.get(cacheKey);
    if (pending) {
        return await pending;
    }

    const task = requestOpenAI(word, descriptors)
        .then(async (updates) => {
            const value = setCachedExampleUpdates(cacheKey, updates);
            await setPersistedExampleUpdates(cacheKey, value, EXAMPLE_CACHE_TTL_MS);
            return value;
        })
        .finally(() => {
            inFlightExampleRequests.delete(cacheKey);
        });

    inFlightExampleRequests.set(cacheKey, task);
    return await task;
}

export async function generateDefinitionExamples(
    word: string,
    meanings: MeaningEntry[],
    options: GenerateExampleOptions = {},
): Promise<ExampleUpdate[]> {
    const shouldTranslate = false;
    const descriptors = collectDescriptors(meanings, shouldTranslate);
    if (descriptors.length === 0) return [];

    const cacheKey = buildCacheKey(word, descriptors);
    const now = Date.now();
    const forceFresh = options.forceFresh === true;

    if (!forceFresh) {
        const snapshot = peekCachedExampleUpdates(cacheKey, now);
        if (snapshot) {
            if (!snapshot.isFresh) {
                void loadFreshExampleUpdates(cacheKey, word, descriptors).catch(() => {});
            }

            return snapshot.value;
        }

        const persisted = await getPersistedExampleUpdates(cacheKey, now);
        if (persisted) {
            exampleCache.set(cacheKey, {
                value: cloneExampleUpdates(persisted.value),
                expiresAt: persisted.expiresAt,
            });

            if (!persisted.isFresh) {
                void loadFreshExampleUpdates(cacheKey, word, descriptors).catch(() => {});
            }

            return cloneExampleUpdates(persisted.value);
        }
    }

    return await loadFreshExampleUpdates(cacheKey, word, descriptors);
}
