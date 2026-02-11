import type { Migration } from "../types";

export const v1ToV2: Migration = {
    from: 1,
    to: 2,
    name: "v1_to_v2_favorites_indexes",
    async up({ execSql }) {
        await execSql(`
            UPDATE favorites
            SET updated_at = COALESCE(updated_at, created_at, CURRENT_TIMESTAMP)
            WHERE updated_at IS NULL;
        `);

        await execSql(`
            CREATE INDEX IF NOT EXISTS idx_favorites_user_updated_at
            ON favorites(user_id, updated_at DESC);
        `);

        await execSql(`
            CREATE INDEX IF NOT EXISTS idx_email_verifications_expires_at
            ON email_verifications(expires_at);
        `);
    },
};
