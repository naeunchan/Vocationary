export type MigrationDatabase = {
    execAsync(sql: string): Promise<unknown>;
    getAllAsync<T = Record<string, unknown>>(sql: string, ...params: unknown[]): Promise<T[]>;
};

export type MigrationLogger = {
    info?: (message: string, context?: Record<string, unknown>) => void;
    warn?: (message: string, context?: Record<string, unknown>) => void;
    error?: (message: string, context?: Record<string, unknown>) => void;
    captureException?: (error: unknown, context?: Record<string, unknown>) => void;
};

export type MigrationContext = {
    db: MigrationDatabase;
    logger: MigrationLogger;
    execSql: (sql: string) => Promise<void>;
    queryAll: <T = Record<string, unknown>>(sql: string) => Promise<T[]>;
};

export type Migration = {
    from: number;
    to: number;
    name: string;
    up: (context: MigrationContext) => Promise<void>;
};
