import { ExampleUpdate } from "@/api/dictionary/exampleGenerator";
import { DictionaryMode, WordResult } from "@/services/dictionary/types";

const buildKey = (meaningIndex: number, definitionIndex: number) => `${meaningIndex}:${definitionIndex}`;

export function applyExampleUpdates(result: WordResult, updates: ExampleUpdate[], mode: DictionaryMode): WordResult {
    if (updates.length === 0) {
        return clearPendingFlags(result);
    }

    const updateMap = new Map<string, ExampleUpdate>();
    for (const update of updates) {
        updateMap.set(buildKey(update.meaningIndex, update.definitionIndex), update);
    }

    return {
        ...result,
        meanings: result.meanings.map((meaning, meaningIndex) => ({
            ...meaning,
            definitions: meaning.definitions.map((definition, definitionIndex) => {
                const key = buildKey(meaningIndex, definitionIndex);
                const update = updateMap.get(key);

                const next = { ...definition };

                if (update?.example) {
                    next.example = update.example;
                }
                if (mode === "en-ko" && update?.translatedExample) {
                    next.translatedExample = update.translatedExample;
                }
                if (update) {
                    next.pendingExample = false;
                } else if (next.pendingExample) {
                    next.pendingExample = false;
                }

                if (mode === "en-ko") {
                    const original = definition.originalDefinition ?? definition.definition;
                    if (update?.translatedDefinition) {
                        next.originalDefinition = original;
                        next.definition = update.translatedDefinition;
                    }
                    if (next.pendingTranslation) {
                        next.pendingTranslation = false;
                    }
                } else if (next.pendingTranslation) {
                    next.pendingTranslation = false;
                }

                return next;
            }),
        })),
    };
}

export function clearPendingFlags(result: WordResult): WordResult {
    return {
        ...result,
        meanings: result.meanings.map((meaning) => ({
            ...meaning,
            definitions: meaning.definitions.map((definition) => ({
                ...definition,
                pendingExample: false,
                pendingTranslation: false,
            })),
        })),
    };
}
