type OpenAIConfigMock = {
    OPENAI_FEATURE_ENABLED: boolean;
    AI_HEALTH_URL: string;
};

const originalFetch = global.fetch;

function loadModule(config: OpenAIConfigMock) {
    let loaded: typeof import("@/api/dictionary/aiHealth");

    jest.resetModules();
    jest.isolateModules(() => {
        jest.doMock("@/config/openAI", () => config);
        loaded = require("@/api/dictionary/aiHealth") as typeof import("@/api/dictionary/aiHealth");
    });

    return loaded!;
}

function mockFetch(impl: jest.Mock) {
    (global as unknown as { fetch: typeof fetch }).fetch = impl as unknown as typeof fetch;
}

describe("aiHealth", () => {
    afterEach(() => {
        jest.clearAllMocks();
        jest.resetModules();
        (global as unknown as { fetch: typeof fetch }).fetch = originalFetch;
    });

    it("returns unconfigured when the AI proxy health endpoint is unavailable", async () => {
        const module = loadModule({
            OPENAI_FEATURE_ENABLED: false,
            AI_HEALTH_URL: "",
        });
        const fetchMock = jest.fn();
        mockFetch(fetchMock);

        await expect(module.getAIProxyHealth()).resolves.toMatchObject({
            status: "unconfigured",
        });
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("caches successful health checks within the cache TTL", async () => {
        const module = loadModule({
            OPENAI_FEATURE_ENABLED: true,
            AI_HEALTH_URL: "https://example.com/health",
        });
        const fetchMock = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                status: "ok",
                lastSuccessAt: 123,
            }),
        });
        mockFetch(fetchMock);

        const first = await module.getAIProxyHealth();
        const second = await module.getAIProxyHealth();

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(first).toMatchObject({
            status: "ok",
            lastSuccessAt: 123,
        });
        expect(second).toEqual(first);
    });

    it("returns unknown when the health check request fails", async () => {
        const module = loadModule({
            OPENAI_FEATURE_ENABLED: true,
            AI_HEALTH_URL: "https://example.com/health",
        });
        const fetchMock = jest.fn().mockRejectedValue(new Error("network_error"));
        mockFetch(fetchMock);

        await expect(module.getAIProxyHealth()).resolves.toMatchObject({
            status: "unknown",
        });
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });
});
