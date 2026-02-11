export type BackupUnsealErrorCode =
    | "DECRYPT_FAILED"
    | "UNSUPPORTED_VERSION"
    | "INVALID_PAYLOAD"
    | "DECOMPRESS_FAILED"
    | "UNKNOWN";

const DEFAULT_UNSEAL_ERROR_MESSAGES: Record<BackupUnsealErrorCode, string> = {
    DECRYPT_FAILED: "백업 파일을 복호화하지 못했어요.",
    UNSUPPORTED_VERSION: "지원하지 않는 백업 형식이에요.",
    INVALID_PAYLOAD: "백업 파일 구조가 올바르지 않아요.",
    DECOMPRESS_FAILED: "백업 파일 압축을 해제하지 못했어요.",
    UNKNOWN: "백업 파일을 불러오지 못했어요.",
};

type BackupUnsealErrorOptions = {
    cause?: unknown;
    details?: Record<string, unknown>;
};

export class BackupUnsealError extends Error {
    readonly code: BackupUnsealErrorCode;
    readonly cause?: unknown;
    readonly details?: Record<string, unknown>;

    constructor(code: BackupUnsealErrorCode, message?: string, options?: BackupUnsealErrorOptions) {
        super(message ?? DEFAULT_UNSEAL_ERROR_MESSAGES[code]);
        this.name = "BackupUnsealError";
        this.code = code;
        this.cause = options?.cause;
        this.details = options?.details;
    }
}

export function decryptFailed(cause?: unknown, message?: string) {
    return new BackupUnsealError("DECRYPT_FAILED", message, { cause });
}

export function unsupportedVersion(foundVersion: unknown, supportedVersions: number[] = [1, 2], message?: string) {
    return new BackupUnsealError("UNSUPPORTED_VERSION", message, {
        details: {
            foundVersion,
            supportedVersions,
        },
    });
}

export function invalidPayload(reason: string, details?: Record<string, unknown>, cause?: unknown) {
    return new BackupUnsealError("INVALID_PAYLOAD", reason, {
        details,
        cause,
    });
}
