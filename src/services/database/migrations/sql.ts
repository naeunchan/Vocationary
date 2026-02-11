import type { MigrationDatabase } from "./types";

export async function execSql(db: MigrationDatabase, sql: string) {
    await db.execAsync(sql);
}

export async function queryAll<T = Record<string, unknown>>(db: MigrationDatabase, sql: string) {
    return await db.getAllAsync<T>(sql);
}
