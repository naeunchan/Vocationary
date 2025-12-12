import { Buffer } from "buffer";
import * as Crypto from "expo-crypto";
import { getRandomBytesAsync } from "expo-crypto";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

import { type BackupPayload, exportBackup, importBackup } from "@/services/database";

const BACKUP_DIRECTORY = `${FileSystem.documentDirectory ?? FileSystem.cacheDirectory ?? ""}backups`;

type SealedBackup = {
    version: 1;
    encrypted: true;
    salt: string;
    ciphertext: string;
    integrity: string;
};

async function ensureBackupDirectory() {
    if (!BACKUP_DIRECTORY) {
        throw new Error("백업 디렉터리를 생성할 수 없어요.");
    }
    const info = await FileSystem.getInfoAsync(BACKUP_DIRECTORY);
    if (!info.exists) {
        await FileSystem.makeDirectoryAsync(BACKUP_DIRECTORY, { intermediates: true });
    }
}

function validateBackupPayload(payload: BackupPayload) {
    if (!payload || typeof payload !== "object" || payload.version !== 1) {
        throw new Error("지원하지 않는 백업 형식이에요.");
    }
    if (
        !Array.isArray(payload.users) ||
        typeof payload.favorites !== "object" ||
        !Array.isArray(payload.searchHistory)
    ) {
        throw new Error("백업 파일 구조가 올바르지 않아요.");
    }
}

async function deriveKey(passphrase: string, salt: string) {
    const digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${passphrase}`);
    return Buffer.from(digest, "hex");
}

function xorBytes(data: Uint8Array, key: Uint8Array) {
    const output = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i += 1) {
        output[i] = data[i] ^ key[i % key.length];
    }
    return output;
}

async function sealPayload(payload: BackupPayload, passphrase: string): Promise<SealedBackup> {
    if (!passphrase.trim()) {
        throw new Error("암호를 입력해주세요.");
    }
    validateBackupPayload(payload);
    const saltBytes = await getRandomBytesAsync(8);
    const salt = Buffer.from(saltBytes).toString("hex");
    const key = await deriveKey(passphrase, salt);
    const plaintext = Buffer.from(JSON.stringify(payload), "utf8");
    const ciphertextBytes = xorBytes(plaintext, key);
    const ciphertext = Buffer.from(ciphertextBytes).toString("base64");
    const integrity = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${ciphertext}:${salt}`);

    return { version: 1, encrypted: true, salt, ciphertext, integrity };
}

async function unsealPayload(serialized: string, passphrase: string): Promise<BackupPayload> {
    if (!passphrase.trim()) {
        throw new Error("암호를 입력해주세요.");
    }
    let parsed: SealedBackup | BackupPayload;
    try {
        parsed = JSON.parse(serialized);
    } catch {
        throw new Error("백업 파일을 읽을 수 없어요.");
    }

    if ((parsed as SealedBackup).encrypted) {
        const sealed = parsed as SealedBackup;
        if (sealed.version !== 1 || !sealed.ciphertext || !sealed.salt || !sealed.integrity) {
            throw new Error("백업 파일 형식이 올바르지 않아요.");
        }

        const expectedIntegrity = await Crypto.digestStringAsync(
            Crypto.CryptoDigestAlgorithm.SHA256,
            `${sealed.ciphertext}:${sealed.salt}`,
        );
        if (expectedIntegrity !== sealed.integrity) {
            throw new Error("백업 파일 무결성 검증에 실패했어요.");
        }

        const key = await deriveKey(passphrase, sealed.salt);
        const cipherBytes = Buffer.from(sealed.ciphertext, "base64");
        const plainBytes = xorBytes(cipherBytes, key);
        const plaintext = Buffer.from(plainBytes).toString("utf8");
        const payload = JSON.parse(plaintext) as BackupPayload;
        validateBackupPayload(payload);
        return payload;
    }

    // Legacy unencrypted payload
    validateBackupPayload(parsed as BackupPayload);
    return parsed as BackupPayload;
}

export async function exportBackupToFile(passphrase: string) {
    const sealed = await sealPayload(await exportBackup(), passphrase);
    await ensureBackupDirectory();
    const fileName = `vocationary-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    const fileUri = `${BACKUP_DIRECTORY}/${fileName}`;
    await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(sealed, null, 2), {
        encoding: FileSystem.EncodingType.UTF8,
    });

    if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
            mimeType: "application/json",
            dialogTitle: "Vocationary 백업 내보내기",
            UTI: "public.json",
        });
    }
    return fileUri;
}

export async function importBackupFromDocument(passphrase: string): Promise<boolean> {
    const result = await DocumentPicker.getDocumentAsync({
        type: ["application/json", "text/json"],
        copyToCacheDirectory: true,
        multiple: false,
    });
    if (result.canceled) {
        return false;
    }
    const asset = result.assets?.[0];
    if (!asset?.uri) {
        throw new Error("선택한 파일을 불러올 수 없어요.");
    }
    const contents = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.UTF8 });
    const payload = await unsealPayload(contents, passphrase);
    await importBackup(payload);
    return true;
}
