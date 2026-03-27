import {
    buildStudyCacheKey,
    clearStudySessionCache,
    getCachedStudySession,
    peekCachedStudySession,
    setCachedStudySession,
} from "@/services/study/cache";
import { StudySession } from "@/services/study/types";

const meanings = [
    {
        partOfSpeech: "noun",
        definitions: [
            {
                definition: "a central point of attention",
                example: "The focus of the lesson was pronunciation.",
            },
        ],
    },
];

const session: StudySession = {
    word: "focus",
    generatedAt: 123,
    cards: [
        {
            id: "card-1",
            type: "cloze",
            prompt: "Stay ____ during class.",
            choices: [
                { id: "a", label: "focus", value: "focus" },
                { id: "b", label: "wander", value: "wander" },
            ],
            answer: "focus",
            explanation: "Focus fits the study context.",
        },
    ],
};

describe("study cache", () => {
    afterEach(() => {
        clearStudySessionCache();
    });

    it("builds a stable cache key from word, meanings, and card config", () => {
        const first = buildStudyCacheKey("Focus", meanings, ["cloze", "usage-check"], 4);
        const second = buildStudyCacheKey("focus", meanings, ["usage-check", "cloze"], 4);

        expect(first).toBe(second);
    });

    it("returns a cloned cached session", () => {
        const cacheKey = buildStudyCacheKey("focus", meanings);
        setCachedStudySession(cacheKey, session, 1000);

        const cached = getCachedStudySession(cacheKey, 1001);

        expect(cached).toEqual(session);
        expect(cached).not.toBe(session);
        expect(cached?.cards).not.toBe(session.cards);
    });

    it("returns null for expired cache entries", () => {
        const cacheKey = buildStudyCacheKey("focus", meanings);
        setCachedStudySession(cacheKey, session, 1000);

        expect(getCachedStudySession(cacheKey, 1000 + 1000 * 60 * 20 + 1)).toBeNull();
    });

    it("peeks stale cached sessions without deleting them", () => {
        const cacheKey = buildStudyCacheKey("focus", meanings);
        setCachedStudySession(cacheKey, session, 1000);

        expect(peekCachedStudySession(cacheKey, 1000 + 1000 * 60 * 20 + 1)).toEqual({
            isFresh: false,
            session,
        });
    });
});
