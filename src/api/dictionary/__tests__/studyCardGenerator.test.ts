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
});
