const captureAppError = jest.fn();
const originalFetch = global.fetch;

function mockFetch(impl: jest.Mock) {
    (global as unknown as { fetch: typeof fetch }).fetch = impl as unknown as typeof fetch;
}

function loadModule() {
    let loaded: typeof import("@/api/dictionary/freeDictionaryClient");

    jest.resetModules();
    jest.isolateModules(() => {
        jest.doMock("@/logging/logger", () => ({
            captureAppError,
        }));
        loaded =
            require("@/api/dictionary/freeDictionaryClient") as typeof import("@/api/dictionary/freeDictionaryClient");
    });

    return loaded!;
}

describe("freeDictionaryClient", () => {
    afterEach(() => {
        jest.clearAllMocks();
        jest.resetModules();
        (global as unknown as { fetch: typeof fetch }).fetch = originalFetch;
    });

    it("maps 404 responses to a validation error without logging", async () => {
        const { fetchDictionaryEntry } = loadModule();
        const fetchMock = jest.fn().mockResolvedValue({
            ok: false,
            status: 404,
        });
        mockFetch(fetchMock);

        await expect(fetchDictionaryEntry("vocationary")).rejects.toMatchObject({
            kind: "ValidationError",
            message: "철자를 다시 확인하거나 다른 단어로 검색해 보세요.",
            code: "DICTIONARY_NOT_FOUND",
            retryable: false,
        });
        expect(captureAppError).not.toHaveBeenCalled();
    });

    it("logs 5xx responses as server errors", async () => {
        const { fetchDictionaryEntry } = loadModule();
        const fetchMock = jest.fn().mockResolvedValue({
            ok: false,
            status: 503,
        });
        mockFetch(fetchMock);

        await expect(fetchDictionaryEntry("apple")).rejects.toMatchObject({
            kind: "ServerError",
            message: "사전 데이터를 불러올 수 없어요.",
            code: "HTTP_503",
            retryable: true,
        });
        expect(captureAppError).toHaveBeenCalledTimes(1);
    });
});
