import { MigrationError } from "../errors";
import { getUserVersion } from "../getUserVersion";
import { LATEST_SCHEMA_VERSION } from "../index";
import { runMigrations } from "../runMigrations";
import type { Migration, MigrationLogger } from "../types";
import { createTestMigrationDatabase, type TestMigrationDatabase } from "./testDb";

function createLoggerMock(): Required<MigrationLogger> {
    return {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        captureException: jest.fn(),
    };
}

async function createV1Fixture(db: TestMigrationDatabase) {
    await db.execAsync(`
        CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            display_name TEXT,
            phone_number TEXT,
            password_hash TEXT,
            oauth_provider TEXT,
            oauth_sub TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT
        );
    `);

    await db.execAsync(`
        CREATE UNIQUE INDEX idx_users_oauth_identity
        ON users(oauth_provider, oauth_sub);
    `);

    await db.execAsync(`
        CREATE TABLE favorites (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            word TEXT NOT NULL,
            data TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT,
            UNIQUE(user_id, word),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
    `);

    await db.execAsync(`
        CREATE TABLE session (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            user_id INTEGER,
            is_guest INTEGER NOT NULL DEFAULT 0,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
    `);

    await db.execAsync(`
        CREATE TABLE auto_login (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            username TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
    `);

    await db.execAsync(`
        CREATE TABLE app_preferences (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
    `);

    await db.execAsync(`
        CREATE TABLE email_verifications (
            email TEXT PRIMARY KEY,
            code TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            verified_at TEXT,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
    `);

    await db.execAsync(
        "INSERT INTO users (username, display_name, password_hash) VALUES ('tester@example.com', 'Tester', 'hash-v1');",
    );
    await db.execAsync(`
        INSERT INTO favorites (user_id, word, data, created_at, updated_at)
        VALUES (1, 'hello', '{"word":{"word":"hello"},"status":"toMemorize"}', '2026-02-10T00:00:00.000Z', NULL);
    `);
    await db.execAsync("PRAGMA user_version = 1;");
}

describe("database migrations", () => {
    it("migrates v1 fixture to latest schema while preserving data", async () => {
        const db = await createTestMigrationDatabase();
        const logger = createLoggerMock();

        try {
            await createV1Fixture(db);

            const result = await runMigrations(db, logger);

            expect(result).toEqual({
                from: 1,
                to: LATEST_SCHEMA_VERSION,
                applied: [2],
            });

            await expect(getUserVersion(db)).resolves.toBe(LATEST_SCHEMA_VERSION);

            const favoritesIndex = await db.getAllAsync<{ name: string }>(
                "SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'idx_favorites_user_updated_at'",
            );
            expect(favoritesIndex).toHaveLength(1);

            const emailIndex = await db.getAllAsync<{ name: string }>(
                "SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'idx_email_verifications_expires_at'",
            );
            expect(emailIndex).toHaveLength(1);

            const users = await db.getAllAsync<{ username: string }>("SELECT username FROM users WHERE id = 1");
            expect(users[0]?.username).toBe("tester@example.com");

            const favorites = await db.getAllAsync<{ updated_at: string | null }>(
                "SELECT updated_at FROM favorites WHERE word = 'hello'",
            );
            expect(favorites[0]?.updated_at).toBeTruthy();
        } finally {
            await db.close();
        }
    });

    it("rolls back migration step on failure", async () => {
        const db = await createTestMigrationDatabase();
        const logger = createLoggerMock();

        const failingMigration: Migration = {
            from: 1,
            to: 2,
            name: "v1_to_v2_fail_for_test",
            async up({ execSql }) {
                await execSql("CREATE TABLE migration_rollback_probe (id INTEGER PRIMARY KEY, value TEXT);");
                await execSql("INSERT INTO migration_rollback_probe (value) VALUES ('temp');");
                throw new Error("intentional migration failure");
            },
        };

        try {
            await createV1Fixture(db);

            await expect(
                runMigrations(db, logger, {
                    migrations: [failingMigration],
                    latestSchemaVersion: 2,
                }),
            ).rejects.toBeInstanceOf(MigrationError);

            await expect(getUserVersion(db)).resolves.toBe(1);

            const rolledBackTable = await db.getAllAsync<{ name: string }>(
                "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'migration_rollback_probe'",
            );
            expect(rolledBackTable).toHaveLength(0);

            expect(logger.error).toHaveBeenCalled();
            expect(logger.captureException).toHaveBeenCalled();
        } finally {
            await db.close();
        }
    });
});
