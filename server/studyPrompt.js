const SUPPORTED_CARD_TYPES = ["cloze", "definition-choice", "usage-check"];

function normalizeCardTypes(cardTypes) {
    if (!Array.isArray(cardTypes) || cardTypes.length === 0) {
        return SUPPORTED_CARD_TYPES;
    }

    const filtered = Array.from(new Set(cardTypes.filter((cardType) => SUPPORTED_CARD_TYPES.includes(cardType))));
    return filtered.length > 0 ? filtered : SUPPORTED_CARD_TYPES;
}

function normalizeContext(context) {
    if (!Array.isArray(context)) {
        return [];
    }

    return context
        .map((entry) => ({
            definition: typeof entry?.definition === "string" ? entry.definition.trim() : "",
            example: typeof entry?.example === "string" ? entry.example.trim() : "",
            partOfSpeech: typeof entry?.partOfSpeech === "string" ? entry.partOfSpeech.trim() : "",
        }))
        .filter((entry) => entry.definition)
        .slice(0, 6);
}

function buildStudyPrompt({ word, cardTypes, cardCount, context }) {
    const normalizedWord = typeof word === "string" ? word.trim() : "";
    const normalizedTypes = normalizeCardTypes(cardTypes);
    const normalizedContext = normalizeContext(context);
    const safeCardCount = Number.isFinite(cardCount) ? Math.min(6, Math.max(1, Math.round(cardCount))) : 3;

    const compactContext = JSON.stringify(
        normalizedContext.map((entry, index) => ({
            i: index,
            pos: entry.partOfSpeech || null,
            definition: entry.definition,
            example: entry.example || null,
        })),
    );

    return [
        `Word:${normalizedWord}`,
        `CardTypes:${normalizedTypes.join(",")}`,
        `CardCount:${safeCardCount}`,
        `Context:${compactContext}`,
        "Return short objective vocabulary quiz cards as JSON only.",
        "Use only the supplied context.",
        "cloze=one blank sentence; definition-choice=best definition; usage-check=best short sentence.",
        "Each card requires id,type,prompt,choices[{id,label,value}],answer,explanation.",
        "answer must exactly equal one choice.value.",
    ].join("\n");
}

module.exports = {
    SUPPORTED_CARD_TYPES,
    buildStudyPrompt,
};
