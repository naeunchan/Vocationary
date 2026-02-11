import { classifyUnsealError } from "@/services/backup/classifyUnsealError";
import { BackupUnsealError } from "@/services/backup/errors";

import { exportBackupToFile, importBackupFromDocument } from "../manualBackup";

jest.mock("expo-document-picker", () => ({
    getDocumentAsync: jest.fn(),
}));

jest.mock("expo-file-system/legacy", () => ({
    documentDirectory: "file:///documents",
    cacheDirectory: "file:///cache",
    getInfoAsync: jest.fn(async () => ({ exists: false })),
    makeDirectoryAsync: jest.fn(async () => {}),
    writeAsStringAsync: jest.fn(async () => {}),
    readAsStringAsync: jest.fn(async () => ""),
    EncodingType: { UTF8: "utf8", Base64: "base64" },
}));

jest.mock("expo-sharing", () => ({
    isAvailableAsync: jest.fn(async () => true),
    shareAsync: jest.fn(async () => {}),
}));

jest.mock("expo-crypto", () => ({
    CryptoDigestAlgorithm: { SHA256: "SHA256" },
    digestStringAsync: jest.fn(async (_algo, value) => "hash-" + value),
    getRandomBytesAsync: jest.fn(async (length = 8) => new Uint8Array(length)),
}));

jest.mock("@/services/database", () => ({
    exportBackup: jest.fn(async () => ({
        version: 1,
        exportedAt: "2025-01-01T00:00:00Z",
        users: [],
        favorites: {},
        searchHistory: [],
    })),
    importBackup: jest.fn(async () => ({
        ok: true,
        code: "OK",
        restored: {
            users: 0,
            favorites: 0,
            searchHistory: 0,
        },
    })),
}));

const mockDocumentPicker = jest.requireMock("expo-document-picker");
const mockFileSystem = jest.requireMock("expo-file-system/legacy");
const mockDatabase = jest.requireMock("@/services/database");

function mockDocumentWithContents(contents: string) {
    mockDocumentPicker.getDocumentAsync.mockResolvedValue({
        canceled: false,
        assets: [{ uri: "file:///tmp/backup.json" }],
    });
    mockFileSystem.readAsStringAsync.mockResolvedValue(contents);
}

describe("manualBackup unseal error mapping", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockFileSystem.getInfoAsync.mockResolvedValue({ exists: false });
    });

    it("returns DECRYPT_FAILED when passphrase is wrong", async () => {
        await exportBackupToFile("correct-passphrase");
        const serialized = mockFileSystem.writeAsStringAsync.mock.calls[0]?.[1];
        if (typeof serialized !== "string") {
            throw new Error("expected sealed backup payload");
        }

        mockDocumentWithContents(serialized);

        const result = await importBackupFromDocument("wrong-passphrase");

        expect(result).toMatchObject({ ok: false, code: "DECRYPT_FAILED" });
        expect(mockDatabase.importBackup).not.toHaveBeenCalled();
    });

    it("returns UNSUPPORTED_VERSION without message parsing", async () => {
        mockDocumentWithContents(
            JSON.stringify({
                version: 999,
                encrypted: true,
            }),
        );

        const result = await importBackupFromDocument("secret");

        expect(result).toMatchObject({ ok: false, code: "UNSUPPORTED_VERSION" });
        expect(mockDatabase.importBackup).not.toHaveBeenCalled();
    });

    it("returns INVALID_PAYLOAD for malformed payload even if decrypt path succeeds", async () => {
        mockDocumentWithContents(JSON.stringify({}));

        const result = await importBackupFromDocument("secret");

        expect(result).toMatchObject({ ok: false, code: "INVALID_PAYLOAD" });
        expect(mockDatabase.importBackup).not.toHaveBeenCalled();
    });

    it("maps typed errors by code even when message text is misleading", () => {
        const misleadingError = new BackupUnsealError(
            "DECRYPT_FAILED",
            "this message says INVALID_PAYLOAD but it should still map by code",
        );

        expect(classifyUnsealError(misleadingError).code).toBe("DECRYPT_FAILED");
    });

    it("does not classify raw Error messages by string parsing", () => {
        expect(classifyUnsealError(new Error("DECRYPT_FAILED")).code).toBe("UNKNOWN");
    });
});
