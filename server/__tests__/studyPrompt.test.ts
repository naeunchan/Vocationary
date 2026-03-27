const { buildStudyPrompt } = require("../studyPrompt");

describe("studyPrompt", () => {
    it("limits context payloads to the compact subset", () => {
        const prompt = buildStudyPrompt({
            word: "focus",
            cardTypes: ["cloze", "definition-choice", "usage-check"],
            cardCount: 3,
            context: [
                { definition: "one", example: "one example", partOfSpeech: "noun" },
                { definition: "two", example: "two example", partOfSpeech: "noun" },
                { definition: "three", example: "three example", partOfSpeech: "noun" },
                { definition: "four", example: "four example", partOfSpeech: "noun" },
                { definition: "five", example: "five example", partOfSpeech: "noun" },
                { definition: "six", example: "six example", partOfSpeech: "noun" },
                { definition: "seven", example: "seven example", partOfSpeech: "noun" },
            ],
        });

        expect(prompt).toContain("Word:focus");
        expect(prompt).toContain("CardCount:3");
        expect(prompt).toContain('"definition":"one"');
        expect(prompt).toContain('"definition":"six"');
        expect(prompt).not.toContain('"definition":"seven"');
        expect(prompt).toContain("answer must exactly equal one choice.value.");
    });
});
