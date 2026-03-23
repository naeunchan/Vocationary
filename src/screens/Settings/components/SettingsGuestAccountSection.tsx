import React from "react";

import { GuestActionCard } from "@/screens/Settings/components/GuestActionCard";
import { SettingsSection } from "@/screens/Settings/components/SettingsSection";
import { t } from "@/shared/i18n";

type SettingsGuestAccountSectionProps = {
    onSignUp: () => void;
    onLogin: () => void;
};

export function SettingsGuestAccountSection({ onSignUp, onLogin }: SettingsGuestAccountSectionProps) {
    return (
        <SettingsSection label={t("settings.section.account")} useCard={false}>
            <GuestActionCard onSignUp={onSignUp} onLogin={onLogin} />
        </SettingsSection>
    );
}
