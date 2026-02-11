import { Buffer } from "buffer";

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
const mockSharing = jest.requireMock("expo-sharing");
const mockDatabase = jest.requireMock("@/services/database");

describe("manualBackup", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockFileSystem.getInfoAsync.mockResolvedValue({ exists: false });
    });

    it("exports a backup file and triggers sharing", async () => {
        const filePath = await exportBackupToFile("secret");

        expect(mockDatabase.exportBackup).toHaveBeenCalled();
        expect(mockFileSystem.makeDirectoryAsync).toHaveBeenCalled();
        expect(mockFileSystem.writeAsStringAsync).toHaveBeenCalled();
        expect(mockSharing.shareAsync).toHaveBeenCalledWith(
            expect.stringContaining("vocationary-backup-"),
            expect.objectContaining({ mimeType: "application/json" }),
        );
        expect(filePath).toContain("vocationary-backup-");
    });

    it("imports a backup when a document is selected", async () => {
        mockDocumentPicker.getDocumentAsync.mockResolvedValue({
            canceled: false,
            assets: [{ uri: "file:///tmp/backup.json" }],
        });
        const payload = { version: 1, exportedAt: "t", users: [], favorites: {}, searchHistory: [] };
        const ciphertext = Buffer.from(JSON.stringify(payload)).toString("base64");
        mockFileSystem.readAsStringAsync.mockResolvedValue(
            JSON.stringify({
                version: 1,
                encrypted: true,
                salt: "salt",
                ciphertext,
                integrity: `hash-${ciphertext}:salt`,
            }),
        );

        const result = await importBackupFromDocument("secret");

        expect(result).toEqual({
            ok: true,
            code: "OK",
            restored: {
                users: 0,
                favorites: 0,
                searchHistory: 0,
            },
        });
        expect(mockDatabase.importBackup).toHaveBeenCalled();
    });

    it("returns canceled result when the document picker is cancelled", async () => {
        mockDocumentPicker.getDocumentAsync.mockResolvedValue({ canceled: true });

        const result = await importBackupFromDocument("secret");

        expect(result).toEqual({ canceled: true });
        expect(mockDatabase.importBackup).not.toHaveBeenCalled();
    });
});
