export type TransactionCapableDatabase = {
    execAsync(sql: string): Promise<unknown>;
};

export class TransactionRollbackError extends Error {
    readonly causeError: unknown;
    readonly rollbackError: unknown;

    constructor(message: string, causeError: unknown, rollbackError: unknown) {
        super(message);
        this.name = "TransactionRollbackError";
        this.causeError = causeError;
        this.rollbackError = rollbackError;
    }
}

export async function withTransaction<T, TDb extends TransactionCapableDatabase>(
    db: TDb,
    fn: (txDb: TDb) => Promise<T>,
): Promise<T> {
    await db.execAsync("BEGIN IMMEDIATE;");
    try {
        const result = await fn(db);
        await db.execAsync("COMMIT;");
        return result;
    } catch (error) {
        try {
            await db.execAsync("ROLLBACK;");
        } catch (rollbackError) {
            throw new TransactionRollbackError("트랜잭션 롤백에 실패했어요.", error, rollbackError);
        }
        throw error;
    }
}
