import React from "react";

import { SettingsRow } from "@/screens/Settings/components/SettingsRow";
import { SettingsSection } from "@/screens/Settings/components/SettingsSection";

type AuthenticatedActionsProps = {
    canLogout: boolean;
    onLogout: () => void;
    onNavigateNickname: () => void;
    onNavigatePassword: () => void;
    onNavigateAccountDeletion: () => void;
};

export function AuthenticatedActions({
    canLogout,
    onLogout,
    onNavigateNickname,
    onNavigatePassword,
    onNavigateAccountDeletion,
}: AuthenticatedActionsProps) {
    return (
        <SettingsSection label="계정">
            <SettingsRow label="닉네임 설정" onPress={onNavigateNickname} />
            <SettingsRow label="비밀번호 변경" onPress={onNavigatePassword} />
            {canLogout ? <SettingsRow label="로그아웃" onPress={onLogout} tone="danger" /> : null}
            <SettingsRow label="회원탈퇴" onPress={onNavigateAccountDeletion} tone="danger" isLast />
        </SettingsSection>
    );
}
