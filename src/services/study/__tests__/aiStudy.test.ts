import { generateStudyCards } from "@/api/dictionary/studyCardGenerator";
import { countCorrectStudyAnswers, isStudyAnswerCorrect, loadAIStudySession } from "@/services/study/aiStudy";
import { clearStudySessionCache } from "@/services/study/cache";
import { StudyCard } from "@/services/study/types";

jest.mock("@/api/dictionary/studyCardGenerator", () => ({
    generateStudyCards: jest.fn(),
}));

const mockedGenerateStudyCards = generateStudyCards as jest.MockedFunction<typeof generateStudyCards>;

const meanings = [
    {
        partOfSpeech: "noun",
        definitions: [
            {
                definition: "special attention",
            },
        ],
    },
];

const cards: StudyCard[] = [
    {
        id: "card-1",
        type: "cloze",
        prompt: "Stay ____.",
        choices: [
            { id: "a", label: "focus", value: "focus" },
            { id: "b", label: "delay", value: "delay" },
        ],
        answer: "focus",
        explanation: null,
    },
];

describe("aiStudy helpers", () => {
    afterEach(() => {
        clearStudySessionCache();
        mockedGenerateStudyCards.mockReset();
    });

    it("loads and caches generated study sessions", async () => {
        mockedGenerateStudyCards.mockResolvedValue(cards);

        const first = await loadAIStudySession("focus", meanings);
        const second = await loadAIStudySession("focus", meanings);

        expect(mockedGenerateStudyCards).toHaveBeenCalledTimes(1);
        expect(first.cards).toEqual(cards);
        expect(second.cards).toEqual(cards);
        expect(second).not.toBe(first);
    });

    it("bypasses cache when forceFresh is requested", async () => {
        mockedGenerateStudyCards.mockResolvedValue(cards);

        await loadAIStudySession("focus", meanings);
        await loadAIStudySession("focus", meanings, { forceFresh: true });

        expect(mockedGenerateStudyCards).toHaveBeenCalledTimes(2);
    });

    it("normalizes answers when grading cards", () => {
        expect(isStudyAnswerCorrect(cards[0], " Focus ")).toBe(true);
        expect(
            countCorrectStudyAnswers(cards, {
                "card-1": "focus",
            }),
        ).toBe(1);
    });

    it("rejects empty word input before requesting cards", async () => {
        await expect(loadAIStudySession("   ", meanings)).rejects.toMatchObject({
            code: "AI_STUDY_EMPTY_WORD",
            retryable: false,
        });
        expect(mockedGenerateStudyCards).not.toHaveBeenCalled();
    });
});
