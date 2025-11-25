import React, { useCallback, useMemo, useState } from "react";
import { Alert, Linking, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SettingsScreenProps } from "@/screens/Settings/SettingsScreen.types";
import { createStyles } from "@/screens/Settings/SettingsScreen.styles";
import { GuestActionCard } from "@/screens/Settings/components/GuestActionCard";
import { AuthenticatedActions } from "@/screens/Settings/components/AuthenticatedActions";
import { MISSING_USER_ERROR_MESSAGE } from "@/screens/App/AppScreen.constants";
import { useThemedStyles } from "@/theme/useThemedStyles";
import { FONT_SCALE_OPTIONS, THEME_MODE_OPTIONS } from "@/theme/constants";
import { LEGAL_DOCUMENTS, type LegalDocumentId } from "@/legal/legalDocuments";
import { LegalDocumentModal } from "@/screens/Settings/components/LegalDocumentModal";
import { t } from "@/shared/i18n";

const SUPPORT_EMAIL = "support@vocationary.app";
const CONTACT_SUBJECT = "Vocationary 1:1 문의";

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
	const themeModeLabel = useMemo(() => THEME_MODE_OPTIONS.find((option) => option.value === themeMode)?.label ?? "", [themeMode]);
	const fontScaleLabel = useMemo(() => FONT_SCALE_OPTIONS.find((option) => option.value === fontScale)?.label ?? "", [fontScale]);

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
					<Text style={styles.sectionLabel}>일반</Text>
					<View style={styles.sectionCard}>
						{renderRow("튜토리얼 다시 보기", { onPress: onShowOnboarding })}
						{renderRow("1:1 문의 보내기", { onPress: handleContactSupport })}
						{renderRow("개인정보 처리방침", { onPress: () => handleOpenDocument("privacyPolicy") })}
						{renderRow("서비스 이용약관", { onPress: () => handleOpenDocument("termsOfService") })}
						{renderRow("법적 고지 및 정보", { onPress: () => handleOpenDocument("legalNotice") })}
						{renderRow("앱 버전", { value: appVersion, isLast: true })}
					</View>
				</View>

				<View style={styles.section}>
					<Text style={styles.sectionLabel}>{t("settings.localAccount.sectionLabel")}</Text>
					<View style={styles.infoCard}>
						<Text style={styles.infoCardTitle}>{t("settings.localAccount.title")}</Text>
						<Text style={styles.infoCardBody}>{t("settings.localAccount.body")}</Text>
						<Text style={styles.infoCardBody}>{t("settings.localAccount.body2")}</Text>
					</View>
				</View>

				<View style={styles.section}>
					<Text style={styles.sectionLabel}>디스플레이</Text>
					<View style={styles.sectionCard}>
						{renderRow("화면 모드", { onPress: onNavigateThemeSettings, value: themeModeLabel })}
						{renderRow("글자 크기", { onPress: onNavigateFontSettings, value: fontScaleLabel, isLast: true })}
					</View>
				</View>

				<View style={styles.section}>
					<Text style={styles.sectionLabel}>백업 및 복원</Text>
					<View style={styles.sectionCard}>
						{renderRow("데이터 백업 내보내기", { onPress: onExportBackup })}
						{renderRow("백업에서 복원하기", { onPress: onImportBackup, isLast: true })}
					</View>
				</View>

				{isGuest ? (
					<View style={styles.section}>
						<Text style={styles.sectionLabel}>계정</Text>
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
