import { v0ToV1 } from "./steps/v0_to_v1";
import { v1ToV2 } from "./steps/v1_to_v2";
import type { Migration } from "./types";

export const MIGRATIONS: Migration[] = [v0ToV1, v1ToV2];

export const LATEST_SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1]?.to ?? 0;

export function validateMigrationChain(migrations: Migration[]) {
    if (migrations.length === 0) {
        return;
    }

    for (let index = 0; index < migrations.length; index += 1) {
        const current = migrations[index];
        if (current.from < 0 || current.to < 0) {
            throw new Error(`마이그레이션 버전은 0 이상이어야 해요: ${current.name}`);
        }
        if (current.to !== current.from + 1) {
            throw new Error(`마이그레이션은 1씩 증가해야 해요: ${current.name} (${current.from} -> ${current.to})`);
        }
        if (index === 0) {
            continue;
        }
        const previous = migrations[index - 1];
        if (previous.to !== current.from) {
            throw new Error(
                `마이그레이션 체인에 빈 구간이 있어요: ${previous.name} (${previous.to}) -> ${current.name} (${current.from})`,
            );
        }
    }
}

validateMigrationChain(MIGRATIONS);
