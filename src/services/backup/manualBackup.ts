import { Buffer } from "buffer";
import CryptoJS from "crypto-js";
import * as Crypto from "expo-crypto";
import { getRandomBytesAsync } from "expo-crypto";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

import { type BackupPayload, exportBackup, importBackup } from "@/services/database";

const BACKUP_DIRECTORY = `${FileSystem.documentDirectory ?? FileSystem.cacheDirectory ?? ""}backups`;

type SealedBackupV1 = {
    version: 1;
    encrypted: true;
    salt: string;
    ciphertext: string;
    integrity: string;
};

type SealedBackupV2 = {
    version: 2;
    encrypted: true;
    salt: string;
    iv: string;
    ciphertext: string;
    integrity: string;
    kdf: "pbkdf2-sha256";
    iterations: number;
    cipher: "aes-256-cbc";
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

async function sealPayload(payload: BackupPayload, passphrase: string): Promise<SealedBackupV2> {
    if (!passphrase.trim()) {
        throw new Error("암호를 입력해주세요.");
    }
    validateBackupPayload(payload);
    const saltBytes = await getRandomBytesAsync(16);
    const ivBytes = await getRandomBytesAsync(16);
    const salt = Buffer.from(saltBytes).toString("hex");
    const iv = Buffer.from(ivBytes).toString("hex");
    const iterations = 120_000;

    const saltWordArray = CryptoJS.enc.Hex.parse(salt);
    const ivWordArray = CryptoJS.enc.Hex.parse(iv);
    const key = CryptoJS.PBKDF2(passphrase, saltWordArray, {
        keySize: 256 / 32,
        iterations,
        hasher: CryptoJS.algo.SHA256,
    });
    const macKey = CryptoJS.PBKDF2(`${passphrase}-mac`, saltWordArray, {
        keySize: 256 / 32,
        iterations,
        hasher: CryptoJS.algo.SHA256,
    });

    const plaintext = JSON.stringify(payload);
    const encrypted = CryptoJS.AES.encrypt(plaintext, key, {
        iv: ivWordArray,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
    });
    const ciphertext = encrypted.toString();
    const integrity = CryptoJS.HmacSHA256(`${ciphertext}:${iv}:${salt}`, macKey).toString(CryptoJS.enc.Hex);

    return {
        version: 2,
        encrypted: true,
        salt,
        iv,
        ciphertext,
        integrity,
        kdf: "pbkdf2-sha256",
        iterations,
        cipher: "aes-256-cbc",
    };
}

async function unsealPayload(serialized: string, passphrase: string): Promise<BackupPayload> {
    if (!passphrase.trim()) {
        throw new Error("암호를 입력해주세요.");
    }
    let parsed: SealedBackupV1 | SealedBackupV2 | BackupPayload;
    try {
        parsed = JSON.parse(serialized);
    } catch {
        throw new Error("백업 파일을 읽을 수 없어요.");
    }

    if ((parsed as SealedBackupV1 | SealedBackupV2).encrypted) {
        const sealed = parsed as SealedBackupV1 | SealedBackupV2;
        if (sealed.version === 2) {
            if (!sealed.ciphertext || !sealed.salt || !sealed.iv || !sealed.integrity) {
                throw new Error("백업 파일 형식이 올바르지 않아요.");
            }
            const saltWordArray = CryptoJS.enc.Hex.parse(sealed.salt);
            const ivWordArray = CryptoJS.enc.Hex.parse(sealed.iv);
            const key = CryptoJS.PBKDF2(passphrase, saltWordArray, {
                keySize: 256 / 32,
                iterations: sealed.iterations || 120_000,
                hasher: CryptoJS.algo.SHA256,
            });
            const macKey = CryptoJS.PBKDF2(`${passphrase}-mac`, saltWordArray, {
                keySize: 256 / 32,
                iterations: sealed.iterations || 120_000,
                hasher: CryptoJS.algo.SHA256,
            });
            const expectedIntegrity = CryptoJS.HmacSHA256(
                `${sealed.ciphertext}:${sealed.iv}:${sealed.salt}`,
                macKey,
            ).toString(CryptoJS.enc.Hex);
            if (expectedIntegrity !== sealed.integrity) {
                throw new Error("백업 파일 무결성 검증에 실패했어요.");
            }

            const decrypted = CryptoJS.AES.decrypt(sealed.ciphertext, key, {
                iv: ivWordArray,
                mode: CryptoJS.mode.CBC,
                padding: CryptoJS.pad.Pkcs7,
            });
            const plaintext = decrypted.toString(CryptoJS.enc.Utf8);
            if (!plaintext) {
                throw new Error("백업 파일을 복호화하지 못했어요.");
            }
            const payload = JSON.parse(plaintext) as BackupPayload;
            validateBackupPayload(payload);
            return payload;
        }

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
