import { AppError, createAppError, isAppError } from "@/errors/AppError";

export const AI_TRANSIENT_ERROR_MESSAGE = "AI 연결이 원활하지 않아요. 잠시 후 다시 시도해주세요.";
export const AI_UNAVAILABLE_ERROR_MESSAGE = "AI 기능이 아직 준비되지 않았어요. 사전 검색은 계속 이용할 수 있어요.";

type AIProxyScope = "examples" | "tts";

function codePrefix(scope: AIProxyScope) {
    return scope === "examples" ? "AI_EXAMPLES" : "AI_TTS";
}

export function createAIUnavailableError(scope: AIProxyScope): AppError {
    return createAppError("ValidationError", AI_UNAVAILABLE_ERROR_MESSAGE, {
        code: `${codePrefix(scope)}_UNAVAILABLE`,
        retryable: false,
    });
}

export function createAIHttpError(status: number, scope: AIProxyScope): AppError {
    return createAppError("ServerError", AI_TRANSIENT_ERROR_MESSAGE, {
        code: `${codePrefix(scope)}_HTTP_${status}`,
        retryable: status >= 500 || status === 429 || status === 408,
    });
}

export function createAIInvalidPayloadError(scope: AIProxyScope, cause?: unknown): AppError {
    return createAppError("ServerError", AI_TRANSIENT_ERROR_MESSAGE, {
        code: `${codePrefix(scope)}_INVALID_PAYLOAD`,
        retryable: true,
        cause,
    });
}

export function normalizeAIProxyError(error: unknown, scope: AIProxyScope): AppError {
    if (isAppError(error)) {
        return error;
    }

    const prefix = codePrefix(scope);
    const name = typeof error === "object" && error !== null ? (error as { name?: string }).name : undefined;
    const isAbort = name === "AbortError" || name === "AbortErrorException";

    if (isAbort) {
        return createAppError("NetworkError", AI_TRANSIENT_ERROR_MESSAGE, {
            code: `${prefix}_TIMEOUT`,
            retryable: true,
            cause: error,
        });
    }

    return createAppError("NetworkError", AI_TRANSIENT_ERROR_MESSAGE, {
        code: `${prefix}_NETWORK`,
        retryable: true,
        cause: error,
    });
}
