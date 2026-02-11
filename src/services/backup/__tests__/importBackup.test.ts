import { importBackupAtomic } from "@/services/backup/importBackup";
import {
    createTestMigrationDatabase,
    type TestMigrationDatabase,
} from "@/services/database/migrations/__tests__/testDb";
import { runMigrations } from "@/services/database/migrations/runMigrations";

type Snapshot = {
    users: { username: string; display_name: string | null; phone_number: string | null }[];
    favorites: { user_id: number; word: string; data: string; updated_at: string | null }[];
    searchHistoryPayload: string | null;
};

async function setupSchema(db: TestMigrationDatabase) {
    await runMigrations(db, {
        error: jest.fn(),
        captureException: jest.fn(),
    });
}

async function seedBaseState(db: TestMigrationDatabase) {
    await db.runAsync(
        "INSERT INTO users (username, display_name, phone_number, password_hash, oauth_provider, oauth_sub) VALUES (?, ?, ?, ?, ?, ?)",
        "owner@example.com",
        "Owner",
        "01012341234",
        "hash-base",
        null,
        null,
    );
    await db.runAsync(
        "INSERT INTO favorites (user_id, word, data, updated_at) VALUES (?, ?, ?, ?)",
        1,
        "legacy",
        JSON.stringify({
            word: { word: "legacy" },
            status: "toMemorize",
            updatedAt: "2026-02-11T00:00:00.000Z",
        }),
        "2026-02-11T00:00:00.000Z",
    );
    await db.runAsync(
        "INSERT INTO app_preferences (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)",
        "search.history",
        JSON.stringify([
            {
                term: "legacy",
                mode: "en-en",
                searchedAt: "2026-02-11T00:00:00.000Z",
            },
        ]),
    );
}

async function takeSnapshot(db: TestMigrationDatabase): Promise<Snapshot> {
    const users = await db.getAllAsync<{ username: string; display_name: string | null; phone_number: string | null }>(
        "SELECT username, display_name, phone_number FROM users ORDER BY username ASC",
    );
    const favorites = await db.getAllAsync<{ user_id: number; word: string; data: string; updated_at: string | null }>(
        "SELECT user_id, word, data, updated_at FROM favorites ORDER BY user_id ASC, word ASC",
    );
    const preferenceRows = await db.getAllAsync<{ value: string }>(
        "SELECT value FROM app_preferences WHERE key = 'search.history' LIMIT 1",
    );

    return {
        users,
        favorites,
        searchHistoryPayload: preferenceRows[0]?.value ?? null,
    };
}

function createValidPayload() {
    return {
        version: 1,
        exportedAt: "2026-02-11T01:00:00.000Z",
        users: [
            {
                username: "owner@example.com",
                display_name: "Owner Restored",
                phone_number: "01099998888",
                password_hash: "hash-restored",
                oauth_provider: null,
                oauth_sub: null,
            },
        ],
        favorites: {
            "owner@example.com": [
                {
                    word: { word: "hello" },
                    status: "toMemorize",
                    updatedAt: "2026-02-11T01:00:00.000Z",
                },
                {
                    word: { word: "world" },
                    status: "review",
                    updatedAt: "2026-02-11T01:00:01.000Z",
                },
            ],
        },
        searchHistory: [
            {
                term: "hello",
                mode: "en-en",
                searchedAt: "2026-02-11T01:00:00.000Z",
            },
            {
                term: "world",
                mode: "en-en",
                searchedAt: "2026-02-11T01:00:01.000Z",
            },
            {
                term: "atomic",
                mode: "en-en",
                searchedAt: "2026-02-11T01:00:02.000Z",
            },
        ],
    };
}

describe("importBackupAtomic", () => {
    it("restores users + favorites + searchHistory atomically on success", async () => {
        const db = await createTestMigrationDatabase();
        try {
            await setupSchema(db);
            await seedBaseState(db);

            const result = await importBackupAtomic(db, createValidPayload(), {
                error: jest.fn(),
                captureException: jest.fn(),
            });

            expect(result).toEqual({
                ok: true,
                code: "OK",
                restored: {
                    users: 1,
                    favorites: 2,
                    searchHistory: 3,
                },
            });

            const users = await db.getAllAsync<{ display_name: string | null; phone_number: string | null }>(
                "SELECT display_name, phone_number FROM users WHERE username = 'owner@example.com' LIMIT 1",
            );
            expect(users[0]).toEqual({
                display_name: "Owner Restored",
                phone_number: "01099998888",
            });

            const favorites = await db.getAllAsync<{ word: string }>(
                "SELECT word FROM favorites WHERE user_id = 1 ORDER BY word ASC",
            );
            expect(favorites).toEqual([{ word: "hello" }, { word: "world" }]);

            const historyRows = await db.getAllAsync<{ value: string }>(
                "SELECT value FROM app_preferences WHERE key = 'search.history' LIMIT 1",
            );
            const parsedHistory = JSON.parse(historyRows[0]?.value ?? "[]");
            expect(parsedHistory).toHaveLength(3);
            expect(parsedHistory[0]?.term).toBe("hello");
        } finally {
            await db.close();
        }
    });

    it("rolls back all restored entities when searchHistory write fails", async () => {
        const db = await createTestMigrationDatabase();
        const logger = {
            error: jest.fn(),
            captureException: jest.fn(),
        };

        try {
            await setupSchema(db);
            await seedBaseState(db);

            await db.runAsync(`
                CREATE TRIGGER fail_search_history_insert
                BEFORE INSERT ON app_preferences
                WHEN NEW.key = 'search.history'
                BEGIN
                    SELECT RAISE(FAIL, 'constraint failed: search.history');
                END;
            `);
            await db.runAsync(`
                CREATE TRIGGER fail_search_history_update
                BEFORE UPDATE ON app_preferences
                WHEN NEW.key = 'search.history'
                BEGIN
                    SELECT RAISE(FAIL, 'constraint failed: search.history');
                END;
            `);

            const before = await takeSnapshot(db);
            const result = await importBackupAtomic(db, createValidPayload(), logger);
            const after = await takeSnapshot(db);

            expect(result.ok).toBe(false);
            if (result.ok) {
                throw new Error("expected restore failure");
            }
            expect(result.code).toBe("DB_CONSTRAINT");
            expect(after).toEqual(before);
            expect(logger.error).toHaveBeenCalled();
            expect(logger.captureException).toHaveBeenCalled();
        } finally {
            await db.close();
        }
    });

    it("fails fast on invalid payload and keeps DB unchanged", async () => {
        const db = await createTestMigrationDatabase();
        try {
            await setupSchema(db);
            await seedBaseState(db);

            const before = await takeSnapshot(db);
            const result = await importBackupAtomic(
                db,
                {
                    version: 1,
                    exportedAt: "2026-02-11T01:00:00.000Z",
                    favorites: {},
                    searchHistory: [],
                },
                {
                    error: jest.fn(),
                    captureException: jest.fn(),
                },
            );
            const after = await takeSnapshot(db);

            expect(result).toMatchObject({
                ok: false,
                code: "INVALID_PAYLOAD",
            });
            expect(after).toEqual(before);
        } finally {
            await db.close();
        }
    });

    it("rejects partial payload with invalid favorites entry without DB mutation", async () => {
        const db = await createTestMigrationDatabase();
        try {
            await setupSchema(db);
            await seedBaseState(db);

            const before = await takeSnapshot(db);
            const payload = createValidPayload();
            payload.favorites["owner@example.com"] = [
                {
                    status: "toMemorize",
                    updatedAt: "2026-02-11T01:00:00.000Z",
                } as unknown as { word: { word: string }; status: "toMemorize"; updatedAt: string },
            ];

            const result = await importBackupAtomic(db, payload, {
                error: jest.fn(),
                captureException: jest.fn(),
            });
            const after = await takeSnapshot(db);

            expect(result).toMatchObject({
                ok: false,
                code: "INVALID_PAYLOAD",
            });
            expect(after).toEqual(before);
        } finally {
            await db.close();
        }
    });
});
