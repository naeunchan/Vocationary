import { BackupUnsealError } from "./errors";
import type { RestoreErrorCode } from "./restoreResult";

type ClassifiedUnsealError = {
    code: RestoreErrorCode;
    message: string;
    details?: Record<string, unknown>;
};

export function classifyUnsealError(error: unknown): ClassifiedUnsealError {
    if (error instanceof BackupUnsealError) {
        return {
            code: error.code,
            message: error.message,
            ...(error.details ? { details: error.details } : {}),
        };
    }

    return {
        code: "UNKNOWN",
        message: "백업 파일을 불러오지 못했어요.",
        details: {
            raw: error instanceof Error ? error.message : String(error),
        },
    };
}
