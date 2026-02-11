import { execSql, queryAll } from "./sql";
import type { MigrationDatabase } from "./types";

type UserVersionRow = {
    user_version?: number;
};

function parseUserVersionRow(row: UserVersionRow | undefined) {
    if (!row) {
        return 0;
    }
    const value = row.user_version;
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
        return 0;
    }
    return Math.trunc(value);
}

export async function getUserVersion(db: MigrationDatabase): Promise<number> {
    const rows = await queryAll<UserVersionRow>(db, "PRAGMA user_version;");
    return parseUserVersionRow(rows[0]);
}

export async function setUserVersion(db: MigrationDatabase, version: number): Promise<void> {
    if (!Number.isInteger(version) || version < 0) {
        throw new Error(`잘못된 스키마 버전이에요: ${String(version)}`);
    }
    await execSql(db, `PRAGMA user_version = ${version};`);
}
