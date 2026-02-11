export type RestoreErrorCode =
    | "INVALID_PAYLOAD"
    | "UNSUPPORTED_VERSION"
    | "DECRYPT_FAILED"
    | "DECOMPRESS_FAILED"
    | "DB_CONSTRAINT"
    | "DB_ERROR"
    | "ROLLBACK_FAILED"
    | "UNKNOWN";

export type RestoreOk = {
    ok: true;
    code: "OK";
    restored: {
        users: number;
        favorites: number;
        searchHistory: number;
    };
    warnings?: string[];
};

export type RestoreErr = {
    ok: false;
    code: RestoreErrorCode;
    message: string;
    details?: Record<string, unknown>;
};

export type RestoreResult = RestoreOk | RestoreErr;

const DEFAULT_ERROR_MESSAGES: Record<RestoreErrorCode, string> = {
    INVALID_PAYLOAD: "백업 파일 구조가 올바르지 않아요.",
    UNSUPPORTED_VERSION: "지원하지 않는 백업 형식이에요.",
    DECRYPT_FAILED: "백업 파일을 복호화하지 못했어요.",
    DECOMPRESS_FAILED: "백업 파일 압축을 해제하지 못했어요.",
    DB_CONSTRAINT: "백업 데이터가 현재 앱 데이터와 충돌해 복원을 완료하지 못했어요.",
    DB_ERROR: "백업 데이터를 복원하는 중 데이터베이스 오류가 발생했어요.",
    ROLLBACK_FAILED: "복원 실패 후 데이터베이스를 안전하게 되돌리지 못했어요.",
    UNKNOWN: "백업 데이터를 복원하지 못했어요.",
};

export function createRestoreSuccess(restored: RestoreOk["restored"], warnings?: string[]): RestoreOk {
    return {
        ok: true,
        code: "OK",
        restored,
        ...(warnings && warnings.length > 0 ? { warnings } : {}),
    };
}

export function createRestoreError(
    code: RestoreErrorCode,
    message?: string,
    details?: Record<string, unknown>,
): RestoreErr {
    return {
        ok: false,
        code,
        message: message ?? DEFAULT_ERROR_MESSAGES[code],
        ...(details ? { details } : {}),
    };
}
