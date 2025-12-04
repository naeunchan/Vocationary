import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

import { type BackupPayload, exportBackup, importBackup } from "@/services/database";

const BACKUP_DIRECTORY = `${FileSystem.documentDirectory ?? FileSystem.cacheDirectory ?? ""}backups`;

async function ensureBackupDirectory() {
    if (!BACKUP_DIRECTORY) {
        throw new Error("백업 디렉터리를 생성할 수 없어요.");
    }
    const info = await FileSystem.getInfoAsync(BACKUP_DIRECTORY);
    if (!info.exists) {
        await FileSystem.makeDirectoryAsync(BACKUP_DIRECTORY, { intermediates: true });
    }
}

export async function exportBackupToFile() {
    await ensureBackupDirectory();
    const payload = await exportBackup();
    const fileName = `vocationary-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    const fileUri = `${BACKUP_DIRECTORY}/${fileName}`;
    await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(payload, null, 2), {
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

function parseBackupJson(value: string): BackupPayload {
    const parsed = JSON.parse(value) as BackupPayload;
    if (!parsed || typeof parsed !== "object" || parsed.version !== 1) {
        throw new Error("지원하지 않는 백업 파일이에요.");
    }
    return parsed;
}

export async function importBackupFromDocument(): Promise<boolean> {
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
    const payload = parseBackupJson(contents);
    await importBackup(payload);
    return true;
}
