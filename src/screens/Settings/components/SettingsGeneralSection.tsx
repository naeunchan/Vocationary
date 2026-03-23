import React from "react";

import { type LegalDocumentId } from "@/legal/legalDocuments";
import { SettingsRow } from "@/screens/Settings/components/SettingsRow";
import { SettingsSection } from "@/screens/Settings/components/SettingsSection";
import { t } from "@/shared/i18n";

type SettingsGeneralSectionProps = {
    appVersion: string;
    onShowOnboarding: () => void;
    onContactSupport: () => void;
    onOpenDocument: (id: LegalDocumentId) => void;
};

export function SettingsGeneralSection({
    appVersion,
    onShowOnboarding,
    onContactSupport,
    onOpenDocument,
}: SettingsGeneralSectionProps) {
    return (
        <SettingsSection label={t("settings.section.general")}>
            <SettingsRow label={t("settings.link.tutorial")} onPress={onShowOnboarding} />
            <SettingsRow label={t("settings.link.contact")} onPress={onContactSupport} />
            <SettingsRow
                label={t("settings.link.privacy")}
                onPress={() => {
                    onOpenDocument("privacyPolicy");
                }}
            />
            <SettingsRow
                label={t("settings.link.terms")}
                onPress={() => {
                    onOpenDocument("termsOfService");
                }}
            />
            <SettingsRow
                label={t("settings.link.legal")}
                onPress={() => {
                    onOpenDocument("legalNotice");
                }}
            />
            <SettingsRow label={t("settings.link.appVersion")} value={appVersion} isLast />
        </SettingsSection>
    );
}
