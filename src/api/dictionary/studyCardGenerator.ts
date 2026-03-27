import {
    createAIHttpError,
    createAIInvalidPayloadError,
    createAIUnavailableError,
    normalizeAIProxyError,
} from "@/api/dictionary/aiProxyError";
import { OPENAI_FEATURE_ENABLED, OPENAI_PROXY_KEY, OPENAI_PROXY_URL } from "@/config/openAI";
import { createAppError } from "@/errors/AppError";
import { MeaningEntry } from "@/services/dictionary/types/WordResult";
import { DEFAULT_STUDY_CARD_TYPES, StudyCard, StudyCardChoice, StudyCardType } from "@/services/study/types";

type GenerateStudyCardsOptions = {
    cardTypes?: StudyCardType[];
    cardCount?: number;
};

type StudyContextEntry = {
    definition: string;
    example?: string;
    partOfSpeech?: string;
};

const MAX_STUDY_CONTEXT_WITH_EXAMPLES = 4;
const MAX_STUDY_CONTEXT_WITHOUT_EXAMPLES = 6;
const MAX_DEFINITION_LENGTH = 96;
const MAX_EXAMPLE_LENGTH = 88;

function clampCardCount(value: number | undefined): number {
    if (!Number.isFinite(value)) {
        return 3;
    }

    return Math.min(6, Math.max(1, Math.round(value as number)));
}

function normalizeCardTypes(cardTypes: StudyCardType[] | undefined): StudyCardType[] {
    if (!cardTypes || cardTypes.length === 0) {
        return [...DEFAULT_STUDY_CARD_TYPES];
    }

    const normalized = Array.from(new Set(cardTypes.filter((cardType) => DEFAULT_STUDY_CARD_TYPES.includes(cardType))));
    return normalized.length > 0 ? normalized : [...DEFAULT_STUDY_CARD_TYPES];
}

function normalizeContextText(value: string, maxLength: number): string {
    const collapsed = value.replace(/\s+/g, " ").trim();
    if (collapsed.length <= maxLength) {
        return collapsed;
    }

    const sliced = collapsed.slice(0, maxLength).trim();
    const lastSpaceIndex = sliced.lastIndexOf(" ");
    if (lastSpaceIndex >= Math.floor(maxLength * 0.6)) {
        return sliced.slice(0, lastSpaceIndex).trim();
    }

    return sliced;
}

function shouldIncludeExamples(cardTypes: readonly StudyCardType[]): boolean {
    return cardTypes.includes("cloze") || cardTypes.includes("usage-check");
}

function buildContext(meanings: MeaningEntry[], cardTypes: readonly StudyCardType[]): StudyContextEntry[] {
    const includeExamples = shouldIncludeExamples(cardTypes);
    const maxEntries = includeExamples ? MAX_STUDY_CONTEXT_WITH_EXAMPLES : MAX_STUDY_CONTEXT_WITHOUT_EXAMPLES;

    const entries = meanings.flatMap((meaning) =>
        meaning.definitions
            .map((definition) => {
                const baseDefinition = normalizeContextText(
                    (definition.originalDefinition ?? definition.definition).trim(),
                    MAX_DEFINITION_LENGTH,
                );
                const example = definition.example?.trim()
                    ? normalizeContextText(definition.example.trim(), MAX_EXAMPLE_LENGTH)
                    : undefined;

                return {
                    definition: baseDefinition,
                    example: includeExamples ? example : undefined,
                    partOfSpeech: meaning.partOfSpeech?.trim() || undefined,
                };
            })
            .filter((entry) => entry.definition),
    );

    return entries
        .sort((left, right) => {
            const leftHasExample = Boolean(left.example);
            const rightHasExample = Boolean(right.example);

            if (leftHasExample !== rightHasExample) {
                return leftHasExample ? -1 : 1;
            }

            if (left.definition.length !== right.definition.length) {
                return left.definition.length - right.definition.length;
            }

            return left.definition.localeCompare(right.definition);
        })
        .slice(0, maxEntries);
}

function maxTokensFor(cardCount: number, cardTypes: readonly StudyCardType[], contextLength: number): number {
    const includeExamples = shouldIncludeExamples(cardTypes);
    const typeComplexity = cardTypes.length >= 3 ? 30 : cardTypes.length === 2 ? 15 : 0;
    const exampleComplexity = includeExamples ? 20 : 0;
    const contextComplexity = Math.min(30, contextLength * 5);

    return Math.min(320, Math.max(120, 90 + cardCount * 35 + typeComplexity + exampleComplexity + contextComplexity));
}

function normalizeChoices(value: unknown): StudyCardChoice[] {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .map((choice, index) => {
            const label = typeof choice?.label === "string" ? choice.label.trim() : "";
            const rawValue = typeof choice?.value === "string" ? choice.value.trim() : label;
            if (!label || !rawValue) {
                return null;
            }

            const id = typeof choice?.id === "string" && choice.id.trim() ? choice.id.trim() : `choice-${index + 1}`;
            return { id, label, value: rawValue };
        })
        .filter((choice): choice is StudyCardChoice => Boolean(choice));
}

function normalizeStudyCards(value: unknown): StudyCard[] {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .map((card, index) => {
            const type = typeof card?.type === "string" ? card.type.trim() : "";
            if (!DEFAULT_STUDY_CARD_TYPES.includes(type as StudyCardType)) {
                return null;
            }

            const prompt = typeof card?.prompt === "string" ? card.prompt.trim() : "";
            const answer = typeof card?.answer === "string" ? card.answer.trim() : "";
            const choices = normalizeChoices(card?.choices);
            if (!prompt || !answer || choices.length < 2) {
                return null;
            }

            const id = typeof card?.id === "string" && card.id.trim() ? card.id.trim() : `${type}-${index + 1}`;
            const explanation = typeof card?.explanation === "string" ? card.explanation.trim() : null;

            return {
                id,
                type: type as StudyCardType,
                prompt,
                choices,
                answer,
                explanation,
            };
        })
        .filter((card): card is StudyCard => Boolean(card));
}

export async function generateStudyCards(
    word: string,
    meanings: MeaningEntry[],
    options: GenerateStudyCardsOptions = {},
): Promise<StudyCard[]> {
    const normalizedWord = word.trim();
    if (!normalizedWord) {
        throw createAppError("ValidationError", "학습할 단어가 없어요.", {
            code: "AI_STUDY_EMPTY_WORD",
            retryable: false,
        });
    }

    const cardTypes = normalizeCardTypes(options.cardTypes);
    const cardCount = clampCardCount(options.cardCount);
    const context = buildContext(meanings, cardTypes);
    if (context.length === 0) {
        throw createAppError("ValidationError", "학습 카드에 사용할 뜻이 없어요.", {
            code: "AI_STUDY_EMPTY_CONTEXT",
            retryable: false,
        });
    }

    if (!OPENAI_FEATURE_ENABLED || !OPENAI_PROXY_URL) {
        throw createAIUnavailableError("study");
    }

    const endpointBase = OPENAI_PROXY_URL.replace(/\/+$/, "");
    const requestUrl = `${endpointBase}/study/cards`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
        controller.abort();
    }, 8000);

    let response: Response;
    try {
        response = await fetch(requestUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(OPENAI_PROXY_KEY ? { "x-api-key": OPENAI_PROXY_KEY } : {}),
            },
            body: JSON.stringify({
                word: normalizedWord,
                cardTypes,
                cardCount,
                context,
                maxTokens: maxTokensFor(cardCount, cardTypes, context.length),
            }),
            signal: controller.signal,
        });
    } catch (error) {
        throw normalizeAIProxyError(error, "study");
    } finally {
        clearTimeout(timeoutId);
    }

    if (!response.ok) {
        throw createAIHttpError(response.status, "study");
    }

    let data: unknown;
    try {
        data = await response.json();
    } catch (error) {
        throw createAIInvalidPayloadError("study", error);
    }

    const cards = normalizeStudyCards((data as { cards?: unknown } | null)?.cards);
    if (cards.length === 0) {
        throw createAIInvalidPayloadError("study");
    }

    return cards;
}
