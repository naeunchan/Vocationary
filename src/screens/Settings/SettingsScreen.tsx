import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Linking, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { FEATURE_FLAGS } from "@/config/featureFlags";
import { useAIStatus } from "@/hooks/useAIStatus";
import { LEGAL_DOCUMENTS, type LegalDocumentId } from "@/legal/legalDocuments";
import { MISSING_USER_ERROR_MESSAGE } from "@/screens/App/AppScreen.constants";
import { AuthenticatedActions } from "@/screens/Settings/components/AuthenticatedActions";
import { GuestActionCard } from "@/screens/Settings/components/GuestActionCard";
import { LegalDocumentModal } from "@/screens/Settings/components/LegalDocumentModal";
import { createStyles } from "@/screens/Settings/SettingsScreen.styles";
import { SettingsScreenProps } from "@/screens/Settings/SettingsScreen.types";
import { getPreferenceValue, setPreferenceValue } from "@/services/database";
import { t } from "@/shared/i18n";
import { BIOMETRIC_LOGIN_PREFERENCE_KEY, FONT_SCALE_OPTIONS, THEME_MODE_OPTIONS } from "@/theme/constants";
import { useThemedStyles } from "@/theme/useThemedStyles";

const SUPPORT_EMAIL = "support@vocationary.app";
const CONTACT_SUBJECT = "Vocationary 1:1 문의";

type RowOptions = {
    onPress?: () => void;
    value?: string;
    isLast?: boolean;
    disabled?: boolean;
};

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
    onNavigateProfile,
    onNavigateAccountDeletion,
    onExportBackup,
    onImportBackup,
    themeMode,
    fontScale,
    onNavigateThemeSettings,
    onNavigateFontSettings,
    onNavigateRecoveryGuide,
}: SettingsScreenProps) {
    const styles = useThemedStyles(createStyles);
    const showGuestAccountCta = isGuest && FEATURE_FLAGS.guestAccountCta;
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

    const handleNavigateProfile = useCallback(() => {
        if (!profileUsername) {
            Alert.alert("마이 페이지", MISSING_USER_ERROR_MESSAGE);
            return;
        }
        onNavigateProfile();
    }, [profileUsername, onNavigateProfile]);

    const handleNavigateAccountDeletion = useCallback(() => {
        if (!profileUsername) {
            Alert.alert("회원탈퇴", MISSING_USER_ERROR_MESSAGE);
            return;
        }
        onNavigateAccountDeletion();
    }, [onNavigateAccountDeletion, profileUsername]);

    const handleContactSupport = useCallback(async () => {
        const subject = encodeURIComponent(CONTACT_SUBJECT);
        const body = encodeURIComponent(
            `계정: ${profileUsername ?? (isGuest ? "게스트" : "알 수 없음")}\n앱 버전: ${appVersion}\n\n문의 내용을 작성해주세요.\n`,
        );
        const mailtoUrl = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;

        try {
            const canOpen = await Linking.canOpenURL(mailtoUrl);
            if (!canOpen) {
                throw new Error("Cannot open mail app");
            }
            await Linking.openURL(mailtoUrl);
        } catch (error) {
            Alert.alert("문의하기", `메일 앱을 열 수 없어요.\n${SUPPORT_EMAIL}로 직접 메일을 보내주세요.`);
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
        return profileUsername ?? (isGuest ? "게스트 사용자" : "Vocationary 회원");
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
    const { status: aiStatus } = useAIStatus();
    const [biometricEnabled, setBiometricEnabled] = useState(false);
    const isBiometricSettingVisible = FEATURE_FLAGS.biometricAutoLogin;

    const aiStatusLabel = useMemo(() => {
        switch (aiStatus) {
            case "healthy":
                return "활성";
            case "degraded":
                return "제한적 (백엔드 확인 필요)";
            default:
                return "비활성 (백엔드 필요)";
        }
    }, [aiStatus]);

    useEffect(() => {
        let mounted = true;
        getPreferenceValue(BIOMETRIC_LOGIN_PREFERENCE_KEY)
            .then((value) => {
                if (!mounted) return;
                setBiometricEnabled(value === "true");
            })
            .catch((error) => {
                console.warn("생체인증 설정을 불러오는 중 문제가 발생했어요.", error);
            });
        return () => {
            mounted = false;
        };
    }, []);

    const handleToggleBiometric = useCallback(() => {
        const nextValue = !biometricEnabled;
        setBiometricEnabled(nextValue);
        void setPreferenceValue(BIOMETRIC_LOGIN_PREFERENCE_KEY, nextValue ? "true" : "false").catch((error) => {
            console.warn("생체인증 설정을 저장하는 중 문제가 발생했어요.", error);
        });
    }, [biometricEnabled]);

    const renderRow = (label: string, options: RowOptions = {}) => {
        const { onPress, value, isLast = false, disabled = false } = options;
        const isPressable = Boolean(onPress) && !disabled;
        return (
            <TouchableOpacity
                key={label}
                activeOpacity={isPressable ? 0.6 : 1}
                disabled={!isPressable}
                onPress={onPress}
                style={[
                    styles.row,
                    !isLast && styles.rowBorder,
                    (disabled || (!onPress && !value)) && styles.rowDisabled,
                ]}
            >
                <Text style={styles.rowLabel}>{label}</Text>
                {value ? <Text style={styles.rowValue}>{value}</Text> : <Text style={styles.rowChevron}>›</Text>}
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.profileCard}>
                    <View style={styles.profileAvatar}>
                        <Text style={styles.profileAvatarInitial}>{initials}</Text>
                    </View>
                    <View style={styles.profileInfo}>
                        <Text style={styles.profileName}>{displayName}</Text>
                        <Text style={styles.profileSubtitle}>{profileSubtitle}</Text>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>{t("settings.section.general")}</Text>
                    <View style={styles.sectionCard}>
                        {renderRow(t("settings.link.tutorial"), { onPress: onShowOnboarding })}
                        {renderRow(t("settings.link.contact"), { onPress: handleContactSupport })}
                        {renderRow(t("settings.link.privacy"), { onPress: () => handleOpenDocument("privacyPolicy") })}
                        {renderRow(t("settings.link.terms"), { onPress: () => handleOpenDocument("termsOfService") })}
                        {renderRow(t("settings.link.legal"), {
                            onPress: () => {
                                handleOpenDocument("legalNotice");
                            },
                        })}
                        {renderRow(t("settings.link.recovery"), {
                            onPress: onNavigateRecoveryGuide,
                            value: t("settings.label.recoveryUnavailable"),
                        })}
                        {isBiometricSettingVisible
                            ? renderRow(t("settings.link.biometric"), {
                                  onPress: handleToggleBiometric,
                                  value: biometricEnabled
                                      ? t("settings.label.biometricOn")
                                      : t("settings.label.biometricOff"),
                              })
                            : null}
                        {renderRow(t("settings.link.aiStatus"), { value: aiStatusLabel })}
                        {renderRow(t("settings.link.appVersion"), { value: appVersion, isLast: true })}
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>{t("settings.section.display")}</Text>
                    <View style={styles.sectionCard}>
                        {renderRow(t("settings.link.theme"), {
                            onPress: onNavigateThemeSettings,
                            value: themeModeLabel,
                        })}
                        {renderRow(t("settings.link.font"), {
                            onPress: onNavigateFontSettings,
                            value: fontScaleLabel,
                            isLast: true,
                        })}
                    </View>
                </View>

                {showBackupRestore ? (
                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>{t("settings.section.backup")}</Text>
                        <View style={styles.sectionCard}>
                            {renderRow(t("settings.link.backupExport"), {
                                onPress: () => {
                                    setBackupAction("export");
                                },
                            })}
                            {renderRow(t("settings.link.backupImport"), {
                                onPress: () => {
                                    setBackupAction("import");
                                },
                                isLast: true,
                            })}
                        </View>
                    </View>
                ) : null}

                {isGuest ? (
                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>{t("settings.section.account")}</Text>
                        {showGuestAccountCta ? (
                            <GuestActionCard onSignUp={handleSignUpPress} onLogin={handleLoginPress} />
                        ) : (
                            <View style={styles.sectionCard}>
                                {renderRow(t("settings.link.signUp"), {
                                    value: t("settings.label.comingSoon"),
                                    disabled: true,
                                })}
                                {renderRow(t("settings.link.login"), {
                                    value: t("settings.label.comingSoon"),
                                    disabled: true,
                                    isLast: true,
                                })}
                            </View>
                        )}
                    </View>
                ) : (
                    <AuthenticatedActions
                        canLogout={canLogout}
                        onLogout={handleLogoutPress}
                        onNavigateProfile={handleNavigateProfile}
                        onNavigateAccountDeletion={handleNavigateAccountDeletion}
                    />
                )}
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
            <Modal
                visible={showBackupRestore && backupAction !== null}
                animationType="fade"
                transparent
                onRequestClose={closeBackupModal}
            >
                <View style={styles.backdrop}>
                    <View style={styles.passphraseCard}>
                        <Text style={styles.passphraseTitle}>
                            {backupAction === "export" ? "백업 내보내기" : "백업 불러오기"}
                        </Text>
                        <Text style={styles.passphraseSubtitle}>
                            백업 파일은 입력한 암호로 암호화돼요. 동일한 암호를 기억해두세요.
                        </Text>
                        <TextInput
                            value={passphrase}
                            onChangeText={(text) => {
                                setPassphrase(text);
                                setBackupError(null);
                            }}
                            secureTextEntry
                            placeholder="암호 입력"
                            style={styles.passphraseInput}
                            autoFocus
                        />
                        {backupError ? <Text style={styles.passphraseError}>{backupError}</Text> : null}
                        <View style={styles.passphraseActions}>
                            <TouchableOpacity onPress={closeBackupModal} style={styles.passphraseButtonGhost}>
                                <Text style={styles.passphraseButtonGhostText}>취소</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleConfirmBackup} style={styles.passphraseButton}>
                                <Text style={styles.passphraseButtonText}>확인</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}
