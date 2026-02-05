import { ExampleUpdate, generateDefinitionExamples } from "@/api/dictionary/exampleGenerator";
import { fetchDictionaryEntry } from "@/api/dictionary/freeDictionaryClient";
import { WordResult } from "@/services/dictionary/types";

type WordDataResult = {
    base: WordResult;
    examplesPromise: Promise<ExampleUpdate[]>;
};

function validateSearchTerm(searchTerm: string): string {
    const trimmed = searchTerm.trim().toLowerCase();
    if (!trimmed) {
        throw new Error("검색어를 입력해주세요.");
    }
    if (!/^[a-z\s'-]+$/.test(trimmed)) {
        throw new Error("영어 단어만 검색할 수 있어요.");
    }
    return trimmed;
}

export async function getWordData(searchTerm: string): Promise<WordDataResult> {
    const normalized = validateSearchTerm(searchTerm);
    const base = await fetchDictionaryEntry(normalized);

    const examplesPromise = generateDefinitionExamples(base.word, base.meanings);

    return {
        base,
        examplesPromise,
    };
}
