import QuickLRU from "quick-lru";

import { OPENAI_FEATURE_ENABLED, OPENAI_PROXY_KEY, OPENAI_PROXY_URL } from "@/config/openAI";
import { DictionaryMode } from "@/services/dictionary/types";
import { MeaningEntry } from "@/services/dictionary/types/WordResult";

export type ExampleUpdate = {
    meaningIndex: number;
    definitionIndex: number;
    example?: string;
    translatedExample?: string;
    translatedDefinition?: string;
};

type CacheEntry = {
    expiresAt: number;
    value: ExampleUpdate[];
};

const EXAMPLE_CACHE_TTL_MS = 1000 * 60 * 30;
const exampleCache = new QuickLRU<string, CacheEntry>({ maxSize: 1000 });

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

function buildPrompt(word: string, mode: DictionaryMode, descriptors: DefinitionDescriptor[]): string {
    const shouldTranslate = mode === "en-ko";
    const hint = shouldTranslate
        ? "Create concise English examples (<20 tokens), Korean translation for each example, and Korean translation for each definition."
        : "Create concise English examples (<20 tokens).";

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

function buildCacheKey(word: string, mode: DictionaryMode, descriptors: DefinitionDescriptor[]): string {
    const signature = descriptors
        .map(
            ({ meaningIndex, definitionIndex, definition, needsExample, needsTranslation }) =>
                `${meaningIndex}:${definitionIndex}:${needsExample ? 1 : 0}:${needsTranslation ? 1 : 0}:${definition}`,
        )
        .join("|");
    return `${mode}:${word.toLowerCase()}:${signature}`;
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

async function requestOpenAI(
    word: string,
    mode: DictionaryMode,
    descriptors: DefinitionDescriptor[],
): Promise<ExampleUpdate[]> {
    if (!OPENAI_FEATURE_ENABLED || !OPENAI_PROXY_URL) {
        return [];
    }

    const endpointBase = OPENAI_PROXY_URL.replace(/\/+$/, "");
    const requestUrl = `${endpointBase}/dictionary/examples`;
    const prompt = buildPrompt(word, mode, descriptors);
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
                mode,
                prompt,
                descriptors,
                schema: EXAMPLE_SCHEMA,
                maxTokens: maxOutputTokensFor(descriptors.length),
            }),
            signal: controller.signal,
        });

        if (!response.ok) {
            return [];
        }

        const data = await response.json();
        const items = Array.isArray(data?.items) ? data.items : [];
        return parseCompletionContent(JSON.stringify({ items }));
    } catch (error) {
        const name = typeof error === "object" && error !== null ? (error as { name?: string }).name : undefined;
        const isAbort = name === "AbortError" || name === "AbortErrorException";
        if (!isAbort) {
            console.warn("예문 생성 프록시 호출 중 문제가 발생했어요.", error);
        }
        return [];
    } finally {
        clearTimeout(timeoutId);
    }
}

export async function generateDefinitionExamples(
    word: string,
    mode: DictionaryMode,
    meanings: MeaningEntry[],
): Promise<ExampleUpdate[]> {
    const shouldTranslate = mode === "en-ko";
    const descriptors = collectDescriptors(meanings, shouldTranslate);
    if (descriptors.length === 0) return [];

    const cacheKey = buildCacheKey(word, mode, descriptors);
    const now = Date.now();
    const cached = exampleCache.get(cacheKey);

    if (cached && cached.expiresAt > now) {
        (async () => {
            try {
                const fresh = await requestOpenAI(word, mode, descriptors);
                exampleCache.set(cacheKey, { value: fresh, expiresAt: Date.now() + EXAMPLE_CACHE_TTL_MS });
            } catch (_) {}
        })();
        return cached.value;
    }

    const updates = await requestOpenAI(word, mode, descriptors);
    exampleCache.set(cacheKey, { value: updates, expiresAt: now + EXAMPLE_CACHE_TTL_MS });

    return updates;
}
