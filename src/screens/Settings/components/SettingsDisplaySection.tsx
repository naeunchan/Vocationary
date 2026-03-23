import React from "react";

import { SettingsRow } from "@/screens/Settings/components/SettingsRow";
import { SettingsSection } from "@/screens/Settings/components/SettingsSection";
import { t } from "@/shared/i18n";

type SettingsDisplaySectionProps = {
    themeModeLabel: string;
    fontScaleLabel: string;
    onNavigateThemeSettings: () => void;
    onNavigateFontSettings: () => void;
};

export function SettingsDisplaySection({
    themeModeLabel,
    fontScaleLabel,
    onNavigateThemeSettings,
    onNavigateFontSettings,
}: SettingsDisplaySectionProps) {
    return (
        <SettingsSection label={t("settings.section.display")}>
            <SettingsRow label={t("settings.link.theme")} onPress={onNavigateThemeSettings} value={themeModeLabel} />
            <SettingsRow
                label={t("settings.link.font")}
                onPress={onNavigateFontSettings}
                value={fontScaleLabel}
                isLast
            />
        </SettingsSection>
    );
}
