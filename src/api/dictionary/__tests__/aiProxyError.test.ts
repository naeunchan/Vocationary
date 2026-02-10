import {
    AI_TRANSIENT_ERROR_MESSAGE,
    AI_UNAVAILABLE_ERROR_MESSAGE,
    createAIHttpError,
    createAIUnavailableError,
    normalizeAIProxyError,
} from "@/api/dictionary/aiProxyError";

describe("aiProxyError helpers", () => {
    it("normalizes timeout errors as retryable network errors", () => {
        const abortError = Object.assign(new Error("aborted"), { name: "AbortError" });

        const normalized = normalizeAIProxyError(abortError, "examples");

        expect(normalized.kind).toBe("NetworkError");
        expect(normalized.message).toBe(AI_TRANSIENT_ERROR_MESSAGE);
        expect(normalized.retryable).toBe(true);
        expect(normalized.code).toBe("AI_EXAMPLES_TIMEOUT");
    });

    it("creates retryable network errors for generic fetch failures", () => {
        const normalized = normalizeAIProxyError(new Error("network down"), "tts");

        expect(normalized.kind).toBe("NetworkError");
        expect(normalized.message).toBe(AI_TRANSIENT_ERROR_MESSAGE);
        expect(normalized.retryable).toBe(true);
        expect(normalized.code).toBe("AI_TTS_NETWORK");
    });

    it("maps 5xx responses to retryable server errors", () => {
        const appError = createAIHttpError(503, "examples");

        expect(appError.kind).toBe("ServerError");
        expect(appError.message).toBe(AI_TRANSIENT_ERROR_MESSAGE);
        expect(appError.retryable).toBe(true);
        expect(appError.code).toBe("AI_EXAMPLES_HTTP_503");
    });

    it("maps unavailable state to non-retryable validation error", () => {
        const appError = createAIUnavailableError("tts");

        expect(appError.kind).toBe("ValidationError");
        expect(appError.message).toBe(AI_UNAVAILABLE_ERROR_MESSAGE);
        expect(appError.retryable).toBe(false);
        expect(appError.code).toBe("AI_TTS_UNAVAILABLE");
    });
});
