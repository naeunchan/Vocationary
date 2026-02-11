import type { Migration } from "../types";

type TableInfoRow = {
    name: string;
};

const REQUIRED_USER_COLUMNS: { name: string; definition: string }[] = [
    { name: "password_hash", definition: "TEXT" },
    { name: "phone_number", definition: "TEXT" },
    { name: "oauth_provider", definition: "TEXT" },
    { name: "oauth_sub", definition: "TEXT" },
];

export const v0ToV1: Migration = {
    from: 0,
    to: 1,
    name: "v0_to_v1_baseline_schema",
    async up({ execSql, queryAll }) {
        await execSql(`
            CREATE TABLE IF NOT EXISTS users (
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

        const columns = await queryAll<TableInfoRow>("PRAGMA table_info(users);");
        const columnNames = new Set(columns.map((column) => column.name));
        for (const column of REQUIRED_USER_COLUMNS) {
            if (columnNames.has(column.name)) {
                continue;
            }
            await execSql(`ALTER TABLE users ADD COLUMN ${column.name} ${column.definition}`);
        }

        await execSql(`
            CREATE UNIQUE INDEX IF NOT EXISTS idx_users_oauth_identity
            ON users(oauth_provider, oauth_sub);
        `);

        await execSql(`
            CREATE TABLE IF NOT EXISTS favorites (
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

        await execSql(`
            CREATE TABLE IF NOT EXISTS session (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                user_id INTEGER,
                is_guest INTEGER NOT NULL DEFAULT 0,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
        `);

        await execSql(`
            CREATE TABLE IF NOT EXISTS auto_login (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                username TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await execSql(`
            CREATE TABLE IF NOT EXISTS app_preferences (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await execSql(`
            CREATE TABLE IF NOT EXISTS email_verifications (
                email TEXT PRIMARY KEY,
                code TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                verified_at TEXT,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
        `);
    },
};
