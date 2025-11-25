import QuickLRU from "quick-lru";
import { DictionaryMode } from "@/services/dictionary/types";
import { MeaningEntry } from "@/services/dictionary/types/WordResult";
import { OPENAI_MINI_MODEL, tryGetOpenAIClient } from "@/api/dictionary/openAIClient";

export type ExampleUpdate = {
	meaningIndex: number;
	definitionIndex: number;
	example?: string;
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
	const hint = shouldTranslate ? "Create concise English examples (<20 tokens) and add Korean translations." : "Create concise English examples (<20 tokens).";

	const compactData = JSON.stringify(
		descriptors.map((d) => ({
			m: d.meaningIndex,
			d: d.definitionIndex,
			text: d.definition,
		})),
	);

	return `Word:${word}\n${hint}\nData:${compactData}\nOutput JSON:{items:[{meaningIndex,definitionIndex,example${shouldTranslate ? ",translatedDefinition" : ""}]}]}`;
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
} as const;

function buildCacheKey(word: string, mode: DictionaryMode, descriptors: DefinitionDescriptor[]): string {
	const signature = descriptors
		.map(({ meaningIndex, definitionIndex, definition, needsExample, needsTranslation }) => `${meaningIndex}:${definitionIndex}:${needsExample ? 1 : 0}:${needsTranslation ? 1 : 0}:${definition}`)
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
			translatedDefinition: typeof item.translatedDefinition === "string" ? item.translatedDefinition.trim() : undefined,
		}));
	} catch {
		return [];
	}
}

function maxOutputTokensFor(count: number): number {
	return Math.min(300, Math.max(80, count * 40));
}

async function requestOpenAI(word: string, mode: DictionaryMode, descriptors: DefinitionDescriptor[]): Promise<ExampleUpdate[]> {
	const client = tryGetOpenAIClient();
	if (!client) {
		return [];
	}
	const prompt = buildPrompt(word, mode, descriptors);

	try {
		const response = await client.responses.create({
			model: OPENAI_MINI_MODEL,
			input: [{ role: "user", content: prompt }],
			text: {
				format: {
					type: "json_schema",
					name: EXAMPLE_SCHEMA.name,
					schema: EXAMPLE_SCHEMA.schema,
					strict: EXAMPLE_SCHEMA.strict,
				},
			},
			max_output_tokens: maxOutputTokensFor(descriptors.length),
			temperature: 0.2,
		});

		const rawOutput = response.output_text ?? "";
		return parseCompletionContent(rawOutput);
	} catch (error) {
		console.warn("[dictionary] Failed to request OpenAI examples.", error);
		return [];
	}
}

export async function generateDefinitionExamples(word: string, mode: DictionaryMode, meanings: MeaningEntry[]): Promise<ExampleUpdate[]> {
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
