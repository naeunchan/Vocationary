import React, { useCallback, useMemo, useState } from "react";
import { Alert, Linking, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { FEATURE_FLAGS } from "@/config/featureFlags";
import { LEGAL_DOCUMENTS, type LegalDocumentId } from "@/legal/legalDocuments";
import { MISSING_USER_ERROR_MESSAGE } from "@/screens/App/AppScreen.constants";
import { AuthenticatedActions } from "@/screens/Settings/components/AuthenticatedActions";
import { BackupPassphraseModal } from "@/screens/Settings/components/BackupPassphraseModal";
import { GuestActionCard } from "@/screens/Settings/components/GuestActionCard";
import { LegalDocumentModal } from "@/screens/Settings/components/LegalDocumentModal";
import { SettingsBackupSection } from "@/screens/Settings/components/SettingsBackupSection";
import { SettingsDisplaySection } from "@/screens/Settings/components/SettingsDisplaySection";
import { SettingsGeneralSection } from "@/screens/Settings/components/SettingsGeneralSection";
import { SettingsProfileCard } from "@/screens/Settings/components/SettingsProfileCard";
import { SettingsSection } from "@/screens/Settings/components/SettingsSection";
import { createStyles } from "@/screens/Settings/SettingsScreen.styles";
import { SettingsScreenProps } from "@/screens/Settings/SettingsScreen.types";
import { buildSupportMailtoUrl, SETTINGS_SUPPORT_EMAIL } from "@/screens/Settings/utils/settingsSupport";
import { t } from "@/shared/i18n";
import { FONT_SCALE_OPTIONS, THEME_MODE_OPTIONS } from "@/theme/constants";
import { useThemedStyles } from "@/theme/useThemedStyles";

export function SettingsScreen({
    onLogout,
    canLogout,
    isGuest,
    onRequestLogin,
    onRequestSignUp,
    onShowOnboarding,
    appVersion,
    profileDisplayName,
    profileUsername,
    onNavigateNickname,
    onNavigatePassword,
    onNavigateAccountDeletion,
    onExportBackup,
    onImportBackup,
    themeMode,
    fontScale,
    onNavigateThemeSettings,
    onNavigateFontSettings,
}: SettingsScreenProps) {
    const styles = useThemedStyles(createStyles);
    const showAccountAuth = FEATURE_FLAGS.accountAuth;
    const showGuestAccountCta = isGuest && showAccountAuth && FEATURE_FLAGS.guestAccountCta;
    const showBackupRestore = FEATURE_FLAGS.backupRestore;
    const handleLogoutPress = useCallback(() => {
        if (!canLogout) {
            return;
        }
        Alert.alert("로그아웃", "정말 로그아웃할까요?", [
            { text: "취소", style: "cancel" },
            {
                text: "로그아웃",
                style: "destructive",
                onPress: onLogout,
            },
        ]);
    }, [canLogout, onLogout]);

    const handleLoginPress = useCallback(() => {
        if (!showGuestAccountCta) {
            return;
        }
        onRequestLogin();
    }, [onRequestLogin, showGuestAccountCta]);

    const handleSignUpPress = useCallback(() => {
        if (!showGuestAccountCta) {
            return;
        }
        onRequestSignUp();
    }, [onRequestSignUp, showGuestAccountCta]);

    const handleNavigateNickname = useCallback(() => {
        if (!profileUsername) {
            Alert.alert("닉네임 설정", MISSING_USER_ERROR_MESSAGE);
            return;
        }
        onNavigateNickname();
    }, [profileUsername, onNavigateNickname]);

    const handleNavigatePassword = useCallback(() => {
        if (!profileUsername) {
            Alert.alert("비밀번호 변경", MISSING_USER_ERROR_MESSAGE);
            return;
        }
        onNavigatePassword();
    }, [profileUsername, onNavigatePassword]);

    const handleNavigateAccountDeletion = useCallback(() => {
        if (!profileUsername) {
            Alert.alert("회원탈퇴", MISSING_USER_ERROR_MESSAGE);
            return;
        }
        onNavigateAccountDeletion();
    }, [onNavigateAccountDeletion, profileUsername]);

    const handleContactSupport = useCallback(async () => {
        const mailtoUrl = buildSupportMailtoUrl({
            appVersion,
            isGuest,
            profileUsername,
        });

        try {
            const canOpen = await Linking.canOpenURL(mailtoUrl);
            if (!canOpen) {
                throw new Error("Cannot open mail app");
            }
            await Linking.openURL(mailtoUrl);
        } catch {
            Alert.alert("문의하기", `메일 앱을 열 수 없어요.\n${SETTINGS_SUPPORT_EMAIL}로 직접 메일을 보내주세요.`);
        }
    }, [appVersion, isGuest, profileUsername]);

    const [activeDocument, setActiveDocument] = useState<LegalDocumentId | null>(null);
    const [backupAction, setBackupAction] = useState<"export" | "import" | null>(null);
    const [passphrase, setPassphrase] = useState("");
    const [backupError, setBackupError] = useState<string | null>(null);

    const closeBackupModal = () => {
        setBackupAction(null);
        setPassphrase("");
        setBackupError(null);
    };

    const handleConfirmBackup = useCallback(async () => {
        if (!backupAction) return;
        const normalized = passphrase.trim();
        if (!normalized) {
            setBackupError("암호를 입력해주세요.");
            return;
        }
        try {
            if (backupAction === "export") {
                await onExportBackup(normalized);
            } else {
                await onImportBackup(normalized);
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : "백업 작업 중 문제가 발생했어요.";
            Alert.alert("백업", message);
        } finally {
            closeBackupModal();
        }
    }, [backupAction, onExportBackup, onImportBackup, passphrase]);

    const handleOpenDocument = useCallback((id: LegalDocumentId) => {
        setActiveDocument(id);
    }, []);

    const displayName = useMemo(() => {
        if (profileDisplayName && profileDisplayName.trim()) {
            return profileDisplayName;
        }
        return profileUsername ?? (isGuest ? "게스트 사용자" : "Vocachip 회원");
    }, [profileDisplayName, profileUsername, isGuest]);
    const profileSubtitle = useMemo(() => {
        if (isGuest) {
            return "게스트 모드";
        }
        return profileUsername ? `@${profileUsername}` : "계정 정보를 확인할 수 없어요.";
    }, [isGuest, profileUsername]);
    const initials = (displayName?.charAt(0) || "M").toUpperCase();
    const themeModeLabel = useMemo(
        () => THEME_MODE_OPTIONS.find((option) => option.value === themeMode)?.label ?? "",
        [themeMode],
    );
    const fontScaleLabel = useMemo(
        () => FONT_SCALE_OPTIONS.find((option) => option.value === fontScale)?.label ?? "",
        [fontScale],
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <SettingsProfileCard displayName={displayName} subtitle={profileSubtitle} initials={initials} />

                <SettingsGeneralSection
                    appVersion={appVersion}
                    onShowOnboarding={onShowOnboarding}
                    onContactSupport={handleContactSupport}
                    onOpenDocument={handleOpenDocument}
                />

                <SettingsDisplaySection
                    themeModeLabel={themeModeLabel}
                    fontScaleLabel={fontScaleLabel}
                    onNavigateThemeSettings={onNavigateThemeSettings}
                    onNavigateFontSettings={onNavigateFontSettings}
                />

                {showBackupRestore ? (
                    <SettingsBackupSection
                        onExportBackup={() => {
                            setBackupAction("export");
                        }}
                        onImportBackup={() => {
                            setBackupAction("import");
                        }}
                    />
                ) : null}

                {isGuest && showGuestAccountCta ? (
                    <SettingsSection label={t("settings.section.account")} useCard={false}>
                        <GuestActionCard onSignUp={handleSignUpPress} onLogin={handleLoginPress} />
                    </SettingsSection>
                ) : !isGuest ? (
                    <AuthenticatedActions
                        canLogout={canLogout}
                        onLogout={handleLogoutPress}
                        onNavigateNickname={handleNavigateNickname}
                        onNavigatePassword={handleNavigatePassword}
                        onNavigateAccountDeletion={handleNavigateAccountDeletion}
                    />
                ) : null}
            </ScrollView>
            {activeDocument ? (
                <LegalDocumentModal
                    title={LEGAL_DOCUMENTS[activeDocument].title}
                    content={LEGAL_DOCUMENTS[activeDocument].content}
                    visible
                    onClose={() => {
                        setActiveDocument(null);
                    }}
                />
            ) : null}
            <BackupPassphraseModal
                visible={showBackupRestore && backupAction !== null}
                backupAction={backupAction}
                passphrase={passphrase}
                backupError={backupError}
                onChangePassphrase={(text) => {
                    setPassphrase(text);
                    setBackupError(null);
                }}
                onClose={closeBackupModal}
                onConfirm={handleConfirmBackup}
            />
        </SafeAreaView>
    );
}
