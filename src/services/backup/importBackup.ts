import {
    type TransactionCapableDatabase,
    TransactionRollbackError,
    withTransaction,
} from "@/services/database/withTransaction";
import { SEARCH_HISTORY_LIMIT } from "@/services/searchHistory/types";

import { createRestoreError, createRestoreSuccess, type RestoreErrorCode, type RestoreResult } from "./restoreResult";
import { validateBackupPayload } from "./validateBackupPayload";

type BackupImportDatabase = TransactionCapableDatabase & {
    runAsync(sql: string, ...params: unknown[]): Promise<unknown>;
    getAllAsync<T = Record<string, unknown>>(sql: string, ...params: unknown[]): Promise<T[]>;
};

type BackupRestoreLogger = {
    error?: (message: string, context?: Record<string, unknown>) => void;
    captureException?: (error: unknown, context?: Record<string, unknown>) => void;
};

type UserIdRow = {
    id: number;
};

const SEARCH_HISTORY_KEY = "search.history";

function serializeSearchHistory(entries: { term: string; mode: string; searchedAt: string }[]) {
    return JSON.stringify(entries.slice(0, SEARCH_HISTORY_LIMIT));
}

function mapRestoreErrorCode(error: unknown): RestoreErrorCode {
    if (error instanceof TransactionRollbackError) {
        return "ROLLBACK_FAILED";
    }

    const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    if (message.includes("constraint") || message.includes("sqlite_constraint")) {
        return "DB_CONSTRAINT";
    }
    if (message.includes("sqlite") || message.includes("database") || message.includes("db")) {
        return "DB_ERROR";
    }
    return "UNKNOWN";
}

export async function importBackupAtomic(
    db: BackupImportDatabase,
    payload: unknown,
    logger?: BackupRestoreLogger,
): Promise<RestoreResult> {
    const validationResult = validateBackupPayload(payload);
    if (!validationResult.ok) {
        logger?.error?.("backup restore validation failed", {
            code: validationResult.code,
            details: validationResult.details,
        });
        return validationResult;
    }

    const parsedPayload = validationResult.parsed;
    const attempted = {
        users: parsedPayload.users.length,
        favorites: Object.values(parsedPayload.favorites).reduce((acc, entries) => acc + entries.length, 0),
        searchHistory: parsedPayload.searchHistory.length,
    };

    try {
        const restored = await withTransaction(db, async (txDb) => {
            await txDb.execAsync("PRAGMA foreign_keys = ON;");

            let restoredUsers = 0;
            let restoredFavorites = 0;

            for (const user of parsedPayload.users) {
                const existingRows = await txDb.getAllAsync<UserIdRow>(
                    "SELECT id FROM users WHERE username = ? LIMIT 1",
                    user.username,
                );
                let userId = existingRows[0]?.id ?? null;

                if (userId == null) {
                    await txDb.runAsync(
                        "INSERT INTO users (username, display_name, phone_number, password_hash, oauth_provider, oauth_sub) VALUES (?, ?, ?, ?, ?, ?)",
                        user.username,
                        user.display_name,
                        user.phone_number,
                        user.password_hash,
                        user.oauth_provider,
                        user.oauth_sub,
                    );
                    const insertedRows = await txDb.getAllAsync<UserIdRow>(
                        "SELECT id FROM users WHERE username = ? LIMIT 1",
                        user.username,
                    );
                    userId = insertedRows[0]?.id ?? null;
                } else {
                    await txDb.runAsync(
                        `UPDATE users
                        SET display_name = ?, phone_number = ?, password_hash = ?, oauth_provider = ?, oauth_sub = ?, updated_at = CURRENT_TIMESTAMP
                        WHERE id = ?`,
                        user.display_name,
                        user.phone_number,
                        user.password_hash,
                        user.oauth_provider,
                        user.oauth_sub,
                        userId,
                    );
                }

                if (userId == null) {
                    throw new Error(`사용자를 복원하지 못했어요: ${user.username}`);
                }

                restoredUsers += 1;

                await txDb.runAsync("DELETE FROM favorites WHERE user_id = ?", userId);

                const favoriteEntries = parsedPayload.favorites[user.username] ?? [];
                for (const entry of favoriteEntries) {
                    await txDb.runAsync(
                        `
                        INSERT INTO favorites (user_id, word, data, updated_at)
                        VALUES (?, ?, ?, ?)
                    `,
                        userId,
                        entry.word.word,
                        JSON.stringify(entry),
                        entry.updatedAt,
                    );
                    restoredFavorites += 1;
                }
            }

            await txDb.runAsync(
                `
                INSERT INTO app_preferences (key, value, updated_at)
                VALUES (?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(key)
                DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
                `,
                SEARCH_HISTORY_KEY,
                serializeSearchHistory(parsedPayload.searchHistory),
            );

            return {
                users: restoredUsers,
                favorites: restoredFavorites,
                searchHistory: parsedPayload.searchHistory.length,
            };
        });

        return createRestoreSuccess(restored);
    } catch (error) {
        const code = mapRestoreErrorCode(error);
        const message = createRestoreError(code).message;
        const details: Record<string, unknown> = {
            code,
            attempted,
            version: parsedPayload.version,
            errorMessage: error instanceof Error ? error.message : String(error),
        };

        if (error instanceof TransactionRollbackError) {
            details.rollbackError =
                error.rollbackError instanceof Error ? error.rollbackError.message : String(error.rollbackError);
            details.causeError =
                error.causeError instanceof Error ? error.causeError.message : String(error.causeError);
        }

        logger?.error?.("backup restore failed", details);
        logger?.captureException?.(error, {
            feature: "backup_restore",
            ...details,
        });

        return createRestoreError(code, message, details);
    }
}
