type OpenAIConfigMock = {
    OPENAI_FEATURE_ENABLED: boolean;
    OPENAI_PROXY_URL: string;
    OPENAI_PROXY_KEY: string;
};

const originalFetch = global.fetch;
const preferenceStore: Record<string, string> = {};

function loadModule(config: OpenAIConfigMock) {
    let loaded: typeof import("@/api/dictionary/getPronunciationAudio");

    jest.resetModules();
    jest.isolateModules(() => {
        jest.doMock("@/config/openAI", () => config);
        jest.doMock("@/services/database", () => ({
            getPreferenceValue: jest.fn(async (key: string) =>
                Object.prototype.hasOwnProperty.call(preferenceStore, key) ? preferenceStore[key] : null,
            ),
            setPreferenceValue: jest.fn(async (key: string, value: string) => {
                preferenceStore[key] = value;
            }),
        }));
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
        Object.keys(preferenceStore).forEach((key) => {
            delete preferenceStore[key];
        });
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

    it("reuses a persisted audio URL after the module reloads", async () => {
        const firstModule = loadModule({
            OPENAI_FEATURE_ENABLED: true,
            OPENAI_PROXY_URL: "https://example.com/",
            OPENAI_PROXY_KEY: "secret",
        });
        const firstFetchMock = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                audioBase64: null,
                audioUrl: "https://example.com/dictionary/tts/abc123",
            }),
        });
        mockFetch(firstFetchMock);

        await expect(firstModule.getPronunciationAudio("apple")).resolves.toBe(
            "https://example.com/dictionary/tts/abc123",
        );
        expect(firstFetchMock).toHaveBeenCalledTimes(1);

        const secondModule = loadModule({
            OPENAI_FEATURE_ENABLED: true,
            OPENAI_PROXY_URL: "https://example.com/",
            OPENAI_PROXY_KEY: "secret",
        });
        const secondFetchMock = jest.fn();
        mockFetch(secondFetchMock);

        await expect(secondModule.getPronunciationAudio("apple")).resolves.toBe(
            "https://example.com/dictionary/tts/abc123",
        );
        expect(secondFetchMock).not.toHaveBeenCalled();
    });
});
