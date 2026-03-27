type OpenAIConfigMock = {
    OPENAI_FEATURE_ENABLED: boolean;
    OPENAI_PROXY_URL: string;
    OPENAI_PROXY_KEY: string;
};

const originalFetch = global.fetch;

function loadModule(config: OpenAIConfigMock) {
    let loaded: typeof import("@/api/dictionary/getPronunciationAudio");

    jest.resetModules();
    jest.isolateModules(() => {
        jest.doMock("@/config/openAI", () => config);
        jest.doMock("expo-file-system", () => ({
            cacheDirectory: "file:///tmp/",
            documentDirectory: "file:///tmp/",
            writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
            getInfoAsync: jest.fn().mockResolvedValue({ exists: true }),
            EncodingType: { Base64: "base64" },
        }));
        loaded =
            require("@/api/dictionary/getPronunciationAudio") as typeof import("@/api/dictionary/getPronunciationAudio");
    });

    return loaded!;
}

function mockFetch(impl: jest.Mock) {
    (global as unknown as { fetch: typeof fetch }).fetch = impl as unknown as typeof fetch;
}

describe("getPronunciationAudio", () => {
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

        await expect(module.getPronunciationAudio("apple")).rejects.toMatchObject({
            code: "AI_TTS_UNAVAILABLE",
            retryable: false,
        });
    });

    it("prefers direct audio URLs without writing a local file", async () => {
        const module = loadModule({
            OPENAI_FEATURE_ENABLED: true,
            OPENAI_PROXY_URL: "https://example.com/",
            OPENAI_PROXY_KEY: "secret",
        });
        const fetchMock = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                audioBase64: null,
                audioUrl: "https://example.com/dictionary/tts/abc123",
            }),
        });
        mockFetch(fetchMock);

        const fileSystem = require("expo-file-system");
        const uri = await module.getPronunciationAudio("apple");

        expect(uri).toBe("https://example.com/dictionary/tts/abc123");
        expect(fileSystem.writeAsStringAsync).not.toHaveBeenCalled();
    });

    it("falls back to writing a local file when only base64 data is returned", async () => {
        const module = loadModule({
            OPENAI_FEATURE_ENABLED: true,
            OPENAI_PROXY_URL: "https://example.com",
            OPENAI_PROXY_KEY: "secret",
        });
        const fetchMock = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                audioBase64: "YWJj",
                audioUrl: null,
            }),
        });
        mockFetch(fetchMock);

        const fileSystem = require("expo-file-system");
        const uri = await module.getPronunciationAudio("apple");

        expect(uri).toMatch(/^file:\/\/\/tmp\/tts-apple-/);
        expect(fileSystem.writeAsStringAsync).toHaveBeenCalledWith(
            expect.stringMatching(/^file:\/\/\/tmp\/tts-apple-/),
            "YWJj",
            expect.objectContaining({ encoding: "base64" }),
        );
    });
});
