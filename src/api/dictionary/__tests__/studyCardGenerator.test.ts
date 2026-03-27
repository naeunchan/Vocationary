type OpenAIConfigMock = {
    OPENAI_FEATURE_ENABLED: boolean;
    OPENAI_PROXY_URL: string;
    OPENAI_PROXY_KEY: string;
};

const originalFetch = global.fetch;

function loadModule(config: OpenAIConfigMock) {
    let loaded: typeof import("@/api/dictionary/studyCardGenerator");

    jest.resetModules();
    jest.isolateModules(() => {
        jest.doMock("@/config/openAI", () => config);
        loaded = require("@/api/dictionary/studyCardGenerator") as typeof import("@/api/dictionary/studyCardGenerator");
    });

    return loaded!;
}

function mockFetch(impl: jest.Mock) {
    (global as unknown as { fetch: typeof fetch }).fetch = impl as unknown as typeof fetch;
}

const meanings = [
    {
        partOfSpeech: "noun",
        definitions: [
            {
                definition: "special attention",
                example: "Keep your focus during practice.",
            },
        ],
    },
];

const richMeanings = [
    {
        partOfSpeech: "noun",
        definitions: [
            {
                definition:
                    "the ability to keep your thoughts and effort directed toward the thing you are doing for a sustained period of time",
                example:
                    "Maintaining focus during a long revision session helps you finish difficult vocabulary drills with fewer mistakes.",
            },
            {
                definition: "special attention",
                example: "Keep your focus during practice.",
            },
            {
                definition: "a central point of interest",
            },
            {
                definition: "clear mental concentration",
                example: "Focus improves when the room is quiet.",
            },
            {
                definition: "the state of being easy to see clearly",
            },
            {
                definition: "the main subject or purpose",
            },
            {
                definition: "the condition of a lens being correctly adjusted",
            },
        ],
    },
];

describe("studyCardGenerator", () => {
    afterEach(() => {
        jest.clearAllMocks();
        jest.resetModules();
        (global as unknown as { fetch: typeof fetch }).fetch = originalFetch;
    });

    it("throws unavailable when proxy configuration is missing", async () => {
        const module = loadModule({
            OPENAI_FEATURE_ENABLED: false,
            OPENAI_PROXY_URL: "",
            OPENAI_PROXY_KEY: "",
        });

        await expect(module.generateStudyCards("focus", meanings)).rejects.toMatchObject({
            code: "AI_STUDY_UNAVAILABLE",
            retryable: false,
        });
    });

    it("posts study-card requests to the proxy and normalizes the response", async () => {
        const module = loadModule({
            OPENAI_FEATURE_ENABLED: true,
            OPENAI_PROXY_URL: "https://example.com/",
            OPENAI_PROXY_KEY: "secret",
        });
        const fetchMock = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                cards: [
                    {
                        id: "card-1",
                        type: "cloze",
                        prompt: "Stay ____ during practice.",
                        choices: [
                            { id: "a", label: "focus", value: "focus" },
                            { id: "b", label: "delay", value: "delay" },
                        ],
                        answer: "focus",
                        explanation: "Focus matches the sentence.",
                    },
                ],
            }),
        });
        mockFetch(fetchMock);

        const cards = await module.generateStudyCards("focus", meanings, {
            cardTypes: ["cloze"],
            cardCount: 2,
        });

        expect(cards).toEqual([
            expect.objectContaining({
                id: "card-1",
                type: "cloze",
                answer: "focus",
            }),
        ]);
        expect(fetchMock).toHaveBeenCalledWith(
            "https://example.com/study/cards",
            expect.objectContaining({
                method: "POST",
                headers: expect.objectContaining({
                    "Content-Type": "application/json",
                    "x-api-key": "secret",
                }),
            }),
        );

        const request = JSON.parse(fetchMock.mock.calls[0][1].body);
        expect(request).toMatchObject({
            word: "focus",
            cardTypes: ["cloze"],
            cardCount: 2,
            maxTokens: 185,
        });
        expect(request.context).toEqual([
            expect.objectContaining({
                definition: "special attention",
                partOfSpeech: "noun",
            }),
        ]);
    });

    it("maps invalid payloads to AI study payload errors", async () => {
        const module = loadModule({
            OPENAI_FEATURE_ENABLED: true,
            OPENAI_PROXY_URL: "https://example.com",
            OPENAI_PROXY_KEY: "secret",
        });
        const fetchMock = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                cards: [
                    {
                        id: "card-1",
                        type: "unsupported",
                    },
                ],
            }),
        });
        mockFetch(fetchMock);

        await expect(module.generateStudyCards("focus", meanings)).rejects.toMatchObject({
            code: "AI_STUDY_INVALID_PAYLOAD",
            retryable: true,
        });
    });

    it("sends a reduced context for definition-only study cards", async () => {
        const module = loadModule({
            OPENAI_FEATURE_ENABLED: true,
            OPENAI_PROXY_URL: "https://example.com",
            OPENAI_PROXY_KEY: "secret",
        });
        const fetchMock = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                cards: [
                    {
                        id: "card-1",
                        type: "definition-choice",
                        prompt: "Which definition best matches focus?",
                        choices: [
                            { id: "a", label: "special attention", value: "special attention" },
                            { id: "b", label: "a vehicle", value: "a vehicle" },
                        ],
                        answer: "special attention",
                        explanation: "Focus means attention here.",
                    },
                ],
            }),
        });
        mockFetch(fetchMock);

        await module.generateStudyCards("focus", richMeanings, {
            cardTypes: ["definition-choice"],
            cardCount: 3,
        });

        const request = JSON.parse(fetchMock.mock.calls[0][1].body);
        expect(request.maxTokens).toBe(225);
        expect(request.context).toHaveLength(6);
        expect(request.context.every((entry: { example?: string }) => entry.example == null)).toBe(true);
        expect(request.context[0]).toEqual(
            expect.objectContaining({
                definition: "special attention",
                partOfSpeech: "noun",
            }),
        );
        expect(request.context[1].definition.length).toBeLessThanOrEqual(96);
    });
});
