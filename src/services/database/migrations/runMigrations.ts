import { MigrationError } from "./errors";
import { getUserVersion, setUserVersion } from "./getUserVersion";
import { LATEST_SCHEMA_VERSION, MIGRATIONS, validateMigrationChain } from "./index";
import { execSql, queryAll } from "./sql";
import type { Migration, MigrationDatabase, MigrationLogger } from "./types";

export type MigrationRunResult = {
    from: number;
    to: number;
    applied: number[];
};

type RunMigrationsOptions = {
    migrations?: Migration[];
    latestSchemaVersion?: number;
};

const isDevelopmentBuild = typeof __DEV__ !== "undefined" ? __DEV__ : process.env.NODE_ENV !== "production";

function findMigrationForVersion(migrations: Migration[], version: number) {
    return migrations.find((migration) => migration.from === version) ?? null;
}

function logInfo(logger: MigrationLogger, message: string, context?: Record<string, unknown>) {
    if (isDevelopmentBuild) {
        logger.info?.(message, context);
    }
}

async function safeGetUserVersion(db: MigrationDatabase) {
    try {
        return await getUserVersion(db);
    } catch {
        return -1;
    }
}

function createMigrationContext(db: MigrationDatabase, logger: MigrationLogger) {
    return {
        db,
        logger,
        execSql: async (sql: string) => {
            await execSql(db, sql);
        },
        queryAll: async <T = Record<string, unknown>>(sql: string) => {
            return await queryAll<T>(db, sql);
        },
    };
}

export async function runMigrations(
    db: MigrationDatabase,
    logger: MigrationLogger,
    options: RunMigrationsOptions = {},
): Promise<MigrationRunResult> {
    const migrations = options.migrations ?? MIGRATIONS;
    const latestSchemaVersion = options.latestSchemaVersion ?? LATEST_SCHEMA_VERSION;

    validateMigrationChain(migrations);

    let current = await getUserVersion(db);
    const from = current;
    const applied: number[] = [];

    if (current > latestSchemaVersion) {
        const error = new MigrationError(
            `현재 DB 스키마 버전(${current})이 앱 지원 버전(${latestSchemaVersion})보다 높아요.`,
            {
                migrationName: "version_guard",
                from: current,
                to: latestSchemaVersion,
                currentUserVersion: current,
            },
            null,
        );
        logger.error?.("database migration blocked by version mismatch", {
            current,
            latestSchemaVersion,
        });
        logger.captureException?.(error, {
            current,
            latestSchemaVersion,
        });
        throw error;
    }

    while (current < latestSchemaVersion) {
        const migration = findMigrationForVersion(migrations, current);
        if (!migration) {
            const missingError = new MigrationError(
                `다음 버전으로 이동할 마이그레이션을 찾지 못했어요: ${current} -> ${current + 1}`,
                {
                    migrationName: "missing_migration",
                    from: current,
                    to: current + 1,
                    currentUserVersion: current,
                },
                null,
            );
            logger.error?.("database migration missing", {
                current,
                expectedTo: current + 1,
            });
            logger.captureException?.(missingError, {
                current,
                expectedTo: current + 1,
            });
            throw missingError;
        }

        const context = createMigrationContext(db, logger);
        logInfo(logger, "database migration start", {
            name: migration.name,
            from: migration.from,
            to: migration.to,
        });

        await execSql(db, "BEGIN IMMEDIATE;");
        try {
            await migration.up(context);
            await setUserVersion(db, migration.to);
            await execSql(db, "COMMIT;");
            current = migration.to;
            applied.push(current);
            logInfo(logger, "database migration committed", {
                name: migration.name,
                to: migration.to,
            });
        } catch (error) {
            try {
                await execSql(db, "ROLLBACK;");
            } catch (rollbackError) {
                logger.error?.("database migration rollback failed", {
                    name: migration.name,
                    from: migration.from,
                    to: migration.to,
                    rollbackError,
                });
                logger.captureException?.(rollbackError, {
                    migrationName: migration.name,
                    from: migration.from,
                    to: migration.to,
                });
            }

            const currentUserVersion = await safeGetUserVersion(db);
            const migrationError =
                error instanceof MigrationError
                    ? error
                    : new MigrationError(
                          `DB 마이그레이션에 실패했어요: ${migration.name}`,
                          {
                              migrationName: migration.name,
                              from: migration.from,
                              to: migration.to,
                              currentUserVersion,
                          },
                          error,
                      );

            logger.error?.("database migration failed", {
                name: migration.name,
                from: migration.from,
                to: migration.to,
                currentUserVersion,
                error,
            });
            logger.captureException?.(migrationError, {
                name: migration.name,
                from: migration.from,
                to: migration.to,
                currentUserVersion,
            });
            throw migrationError;
        }
    }

    return {
        from,
        to: current,
        applied,
    };
}
