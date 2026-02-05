import { ExampleUpdate } from "@/api/dictionary/exampleGenerator";
import { WordResult } from "@/services/dictionary/types";
import { applyExampleUpdates, clearPendingFlags } from "@/services/dictionary/utils/mergeExampleUpdates";

const buildResult = (): WordResult => ({
    word: "apple",
    phonetic: "/ˈæp.əl/",
    audioUrl: null,
    meanings: [
        {
            partOfSpeech: "noun",
            definitions: [
                {
                    definition: "An apple",
                    example: undefined,
                    originalDefinition: undefined,
                    pendingExample: true,
                    pendingTranslation: true,
                },
            ],
        },
    ],
});

describe("mergeExampleUpdates", () => {
    it("clears pending flags when no updates", () => {
        const result = buildResult();
        const cleared = clearPendingFlags(result);

        expect(cleared.meanings[0].definitions[0].pendingExample).toBe(false);
        expect(cleared.meanings[0].definitions[0].pendingTranslation).toBe(false);
    });

    it("applies example updates and clears flags", () => {
        const result = buildResult();
        const updates: ExampleUpdate[] = [
            {
                meaningIndex: 0,
                definitionIndex: 0,
                example: "This is an apple.",
                translatedExample: null,
                translatedDefinition: null,
            },
        ];

        const merged = applyExampleUpdates(result, updates);
        const definition = merged.meanings[0].definitions[0];

        expect(definition.example).toBe("This is an apple.");
        expect(definition.pendingExample).toBe(false);
        expect(definition.pendingTranslation).toBe(false);
    });

    it("ignores translated fields and keeps the base definition", () => {
        const result = buildResult();
        const updates: ExampleUpdate[] = [
            {
                meaningIndex: 0,
                definitionIndex: 0,
                example: "This is an apple.",
                translatedExample: "이것은 사과입니다.",
                translatedDefinition: "사과",
            },
        ];

        const merged = applyExampleUpdates(result, updates);
        const definition = merged.meanings[0].definitions[0];

        expect(definition.definition).toBe("An apple");
        expect(definition.originalDefinition).toBeUndefined();
        expect(definition.translatedExample).toBeUndefined();
        expect(definition.pendingTranslation).toBe(false);
    });
});
