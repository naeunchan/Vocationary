import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Linking, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PRIVACY_POLICY_URL, TERMS_OF_SERVICE_URL } from "@/config/legal";
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
const RECOVERY_NOTICE = "비밀번호 복구 불가";

type RowOptions = {
    onPress?: () => void;
    value?: string;
    isLast?: boolean;
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
}: SettingsScreenProps) {
    const styles = useThemedStyles(createStyles);
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
        if (!isGuest) {
            return;
        }
        onRequestLogin();
    }, [isGuest, onRequestLogin]);

    const handleSignUpPress = useCallback(() => {
        if (!isGuest) {
            return;
        }
        onRequestSignUp();
    }, [isGuest, onRequestSignUp]);

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

    const handleOpenDocument = useCallback((id: LegalDocumentId) => {
        setActiveDocument(id);
    }, []);

    const handleOpenLinkOrDocument = useCallback(
        async (url: string | null | undefined, fallback: LegalDocumentId) => {
            const target = url?.trim();
            if (target) {
                try {
                    const canOpen = await Linking.canOpenURL(target);
                    if (canOpen) {
                        await Linking.openURL(target);
                        return;
                    }
                } catch (error) {
                    console.warn("법적 문서 링크를 여는 중 문제가 발생했어요.", error);
                }
                Alert.alert("연결할 수 없어요", "웹에서 정책을 열 수 없습니다. 앱 내 내용을 표시할게요.");
            }
            handleOpenDocument(fallback);
        },
        [handleOpenDocument],
    );

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
        const { onPress, value, isLast = false } = options;
        return (
            <TouchableOpacity
                key={label}
                activeOpacity={onPress ? 0.6 : 1}
                disabled={!onPress}
                onPress={onPress}
                style={[styles.row, !isLast && styles.rowBorder, !onPress && !value && styles.rowDisabled]}
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
                        {renderRow(t("settings.link.privacy"), {
                            onPress: () => handleOpenLinkOrDocument(PRIVACY_POLICY_URL, "privacyPolicy"),
                        })}
                        {renderRow(t("settings.link.terms"), {
                            onPress: () => handleOpenLinkOrDocument(TERMS_OF_SERVICE_URL, "termsOfService"),
                        })}
                        {renderRow(t("settings.link.legal"), {
                            onPress: () => {
                                handleOpenDocument("legalNotice");
                            },
                        })}
                        {renderRow(t("settings.link.recovery"), { value: RECOVERY_NOTICE })}
                        {renderRow(t("settings.link.biometric"), {
                            onPress: handleToggleBiometric,
                            value: biometricEnabled
                                ? t("settings.label.biometricOn")
                                : t("settings.label.biometricOff"),
                        })}
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

                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>{t("settings.section.backup")}</Text>
                    <View style={styles.sectionCard}>
                        {renderRow(t("settings.link.backupExport"), { onPress: onExportBackup })}
                        {renderRow(t("settings.link.backupImport"), { onPress: onImportBackup, isLast: true })}
                    </View>
                </View>

                {isGuest ? (
                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>{t("settings.section.account")}</Text>
                        <GuestActionCard onSignUp={handleSignUpPress} onLogin={handleLoginPress} />
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
        </SafeAreaView>
    );
}
