import React from "react";

import { SettingsRow } from "@/screens/Settings/components/SettingsRow";
import { SettingsSection } from "@/screens/Settings/components/SettingsSection";
import { t } from "@/shared/i18n";

type SettingsBackupSectionProps = {
    onExportBackup: () => void;
    onImportBackup: () => void;
};

export function SettingsBackupSection({ onExportBackup, onImportBackup }: SettingsBackupSectionProps) {
    return (
        <SettingsSection label={t("settings.section.backup")}>
            <SettingsRow label={t("settings.link.backupExport")} onPress={onExportBackup} />
            <SettingsRow label={t("settings.link.backupImport")} onPress={onImportBackup} isLast />
        </SettingsSection>
    );
}
