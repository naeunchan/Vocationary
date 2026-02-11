import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import sqlite3 from "sqlite3";

import type { MigrationDatabase } from "../types";

type SqliteDatabase = sqlite3.Database;

function openDatabase(filePath: string) {
    return new Promise<SqliteDatabase>((resolve, reject) => {
        const db = new sqlite3.Database(filePath, (error) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(db);
        });
    });
}

function exec(db: SqliteDatabase, sql: string) {
    return new Promise<void>((resolve, reject) => {
        db.exec(sql, (error) => {
            if (error) {
                reject(error);
                return;
            }
            resolve();
        });
    });
}

function all<T = Record<string, unknown>>(db: SqliteDatabase, sql: string, params: unknown[]) {
    return new Promise<T[]>((resolve, reject) => {
        db.all(sql, params, (error, rows) => {
            if (error) {
                reject(error);
                return;
            }
            resolve((rows ?? []) as T[]);
        });
    });
}

function close(db: SqliteDatabase) {
    return new Promise<void>((resolve, reject) => {
        db.close((error) => {
            if (error) {
                reject(error);
                return;
            }
            resolve();
        });
    });
}

export type TestMigrationDatabase = MigrationDatabase & {
    filePath: string;
    close: () => Promise<void>;
};

export async function createTestMigrationDatabase(): Promise<TestMigrationDatabase> {
    const directory = await mkdtemp(join(tmpdir(), "vocationary-migrations-"));
    const filePath = join(directory, "migration-test.sqlite");
    const raw = await openDatabase(filePath);

    const db: MigrationDatabase = {
        async execAsync(sql: string) {
            await exec(raw, sql);
        },
        async getAllAsync<T = Record<string, unknown>>(sql: string, ...params: unknown[]) {
            return await all<T>(raw, sql, params);
        },
    };

    await db.execAsync("PRAGMA foreign_keys = ON;");

    return {
        ...db,
        filePath,
        async close() {
            await close(raw);
            await rm(directory, { recursive: true, force: true });
        },
    };
}
