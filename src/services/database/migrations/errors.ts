export type MigrationErrorMetadata = {
    migrationName: string;
    from: number;
    to: number;
    currentUserVersion: number;
};

export class MigrationError extends Error {
    readonly metadata: MigrationErrorMetadata;
    readonly causeError: unknown;

    constructor(message: string, metadata: MigrationErrorMetadata, causeError: unknown) {
        super(message);
        this.name = "MigrationError";
        this.metadata = metadata;
        this.causeError = causeError;
    }
}
