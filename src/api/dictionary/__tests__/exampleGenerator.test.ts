type OpenAIConfigMock = {
    OPENAI_FEATURE_ENABLED: boolean;
    OPENAI_PROXY_URL: string;
    OPENAI_PROXY_KEY: string;
};

const originalFetch = global.fetch;
const EXAMPLE_CACHE_TTL_MS = 1000 * 60 * 30;

function loadModule(config: OpenAIConfigMock) {
    let loaded: typeof import("@/api/dictionary/exampleGenerator");

    jest.resetModules();
    jest.isolateModules(() => {
        jest.doMock("@/config/openAI", () => config);
        jest.doMock("quick-lru", () => ({
            __esModule: true,
            default: class QuickLRUMock<Key, Value> extends Map<Key, Value> {
                constructor(_options?: unknown) {
                    super();
                }
            },
        }));
        loaded = require("@/api/dictionary/exampleGenerator") as typeof import("@/api/dictionary/exampleGenerator");
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
            },
        ],
    },
];

describe("exampleGenerator", () => {
    afterEach(() => {
        jest.clearAllMocks();
        jest.restoreAllMocks();
        jest.resetModules();
        (global as unknown as { fetch: typeof fetch }).fetch = originalFetch;
    });

    it("returns stale cached examples immediately and refreshes them in the background", async () => {
        const module = loadModule({
            OPENAI_FEATURE_ENABLED: true,
            OPENAI_PROXY_URL: "https://example.com",
            OPENAI_PROXY_KEY: "secret",
        });
        const nowSpy = jest.spyOn(Date, "now");
        nowSpy.mockReturnValue(1000);

        const fetchMock = jest
            .fn()
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    items: [
                        {
                            meaningIndex: 0,
                            definitionIndex: 0,
                            example: "Keep your focus.",
                            translatedExample: null,
                            translatedDefinition: null,
                        },
                    ],
                }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    items: [
                        {
                            meaningIndex: 0,
                            definitionIndex: 0,
                            example: "Focus helps you finish tasks.",
                            translatedExample: null,
                            translatedDefinition: null,
                        },
                    ],
                }),
            });
        mockFetch(fetchMock);

        const initial = await module.generateDefinitionExamples("focus", meanings);
        expect(initial[0]?.example).toBe("Keep your focus.");

        nowSpy.mockReturnValue(1000 + EXAMPLE_CACHE_TTL_MS + 1);
        const stale = await module.generateDefinitionExamples("focus", meanings);

        expect(stale[0]?.example).toBe("Keep your focus.");
        expect(fetchMock).toHaveBeenCalledTimes(2);

        await Promise.resolve();
        await Promise.resolve();

        const refreshed = await module.generateDefinitionExamples("focus", meanings);
        expect(refreshed[0]?.example).toBe("Focus helps you finish tasks.");
    });

    it("deduplicates concurrent uncached example requests", async () => {
        const module = loadModule({
            OPENAI_FEATURE_ENABLED: true,
            OPENAI_PROXY_URL: "https://example.com",
            OPENAI_PROXY_KEY: "secret",
        });

        let resolveResponse: ((value: unknown) => void) | null = null;
        const fetchMock = jest.fn().mockImplementation(
            () =>
                new Promise((resolve) => {
                    resolveResponse = resolve;
                }),
        );
        mockFetch(fetchMock);

        const firstPromise = module.generateDefinitionExamples("focus", meanings, { forceFresh: true });
        const secondPromise = module.generateDefinitionExamples("focus", meanings, { forceFresh: true });

        expect(fetchMock).toHaveBeenCalledTimes(1);

        resolveResponse?.({
            ok: true,
            json: async () => ({
                items: [
                    {
                        meaningIndex: 0,
                        definitionIndex: 0,
                        example: "Keep your focus.",
                        translatedExample: null,
                        translatedDefinition: null,
                    },
                ],
            }),
        });

        const [first, second] = await Promise.all([firstPromise, secondPromise]);
        expect(first[0]?.example).toBe("Keep your focus.");
        expect(second[0]?.example).toBe("Keep your focus.");
    });

    it("returns an empty list without fetching when the proxy is unavailable", async () => {
        const module = loadModule({
            OPENAI_FEATURE_ENABLED: false,
            OPENAI_PROXY_URL: "",
            OPENAI_PROXY_KEY: "",
        });
        const fetchMock = jest.fn();
        mockFetch(fetchMock);

        await expect(module.generateDefinitionExamples("focus", meanings)).resolves.toEqual([]);
        expect(fetchMock).not.toHaveBeenCalled();
    });
});
