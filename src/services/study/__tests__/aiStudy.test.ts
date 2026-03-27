import { generateStudyCards } from "@/api/dictionary/studyCardGenerator";
import { countCorrectStudyAnswers, isStudyAnswerCorrect, loadAIStudySession } from "@/services/study/aiStudy";
import { buildStudyCacheKey, clearStudySessionCache, setCachedStudySession } from "@/services/study/cache";
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
        jest.restoreAllMocks();
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

    it("returns a stale cached session immediately and refreshes it in the background", async () => {
        const nowSpy = jest.spyOn(Date, "now").mockReturnValue(1000 * 60 * 25);
        const cacheKey = buildStudyCacheKey("focus", meanings);
        setCachedStudySession(cacheKey, sessionWith(cards), 0);

        const refreshedCards = [
            {
                ...cards[0],
                id: "card-2",
                prompt: "Keep your ____ during revision.",
            },
        ];
        mockedGenerateStudyCards.mockResolvedValue(refreshedCards);

        const stale = await loadAIStudySession("focus", meanings);

        expect(stale.cards).toEqual(cards);
        expect(mockedGenerateStudyCards).toHaveBeenCalledTimes(1);

        await Promise.resolve();
        await Promise.resolve();

        const refreshed = await loadAIStudySession("focus", meanings);

        expect(refreshed.cards).toEqual(refreshedCards);
        nowSpy.mockRestore();
    });

    it("deduplicates concurrent study generation requests", async () => {
        let resolveCards: ((value: StudyCard[]) => void) | null = null;
        mockedGenerateStudyCards.mockImplementation(
            () =>
                new Promise<StudyCard[]>((resolve) => {
                    resolveCards = resolve;
                }),
        );

        const firstPromise = loadAIStudySession("focus", meanings, { forceFresh: true });
        const secondPromise = loadAIStudySession("focus", meanings, { forceFresh: true });

        expect(mockedGenerateStudyCards).toHaveBeenCalledTimes(1);

        resolveCards?.(cards);
        const [first, second] = await Promise.all([firstPromise, secondPromise]);

        expect(first.cards).toEqual(cards);
        expect(second.cards).toEqual(cards);
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

function sessionWith(cards: StudyCard[]) {
    return {
        word: "focus",
        generatedAt: 123,
        cards,
    };
}
