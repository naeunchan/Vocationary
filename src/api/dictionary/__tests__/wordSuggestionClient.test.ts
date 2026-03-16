const captureAppError = jest.fn();
const originalFetch = global.fetch;

function mockFetch(impl: jest.Mock) {
    (global as unknown as { fetch: typeof fetch }).fetch = impl as unknown as typeof fetch;
}

function loadModule() {
    let loaded: typeof import("@/api/dictionary/wordSuggestionClient");

    jest.resetModules();
    jest.isolateModules(() => {
        jest.doMock("@/logging/logger", () => ({
            captureAppError,
        }));
        loaded =
            require("@/api/dictionary/wordSuggestionClient") as typeof import("@/api/dictionary/wordSuggestionClient");
    });

    return loaded!;
}

describe("wordSuggestionClient", () => {
    afterEach(() => {
        jest.clearAllMocks();
        jest.resetModules();
        (global as unknown as { fetch: typeof fetch }).fetch = originalFetch;
    });

    it("returns normalized suggestions from the API", async () => {
        const { fetchWordSuggestions } = loadModule();
        const fetchMock = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => [{ word: "apple" }, { word: " application " }, { word: "apple" }, { word: "app" }],
        });
        mockFetch(fetchMock);

        await expect(fetchWordSuggestions("app", 5)).resolves.toEqual(["apple", "application"]);
        expect(captureAppError).not.toHaveBeenCalled();
    });

    it("maps failed responses to server errors", async () => {
        const { fetchWordSuggestions } = loadModule();
        const fetchMock = jest.fn().mockResolvedValue({
            ok: false,
            status: 503,
        });
        mockFetch(fetchMock);

        await expect(fetchWordSuggestions("app")).rejects.toMatchObject({
            kind: "ServerError",
            code: "SUGGESTIONS_HTTP_503",
            retryable: true,
        });
        expect(captureAppError).toHaveBeenCalledTimes(1);
    });
});
