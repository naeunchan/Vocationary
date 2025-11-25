import { StyleSheet } from "react-native";
import type { AppThemeColors } from "@/theme/types";
import { scaleFont } from "@/theme/utils";

export const createLoginScreenStyles = (theme: AppThemeColors, fontScale: number) =>
	StyleSheet.create({
		safeArea: {
			flex: 1,
			backgroundColor: theme.background,
		},
		scrollContent: {
			flexGrow: 1,
			paddingHorizontal: 24,
			paddingTop: 48,
			paddingBottom: 32,
		},
		content: {
			flex: 1,
		},
		title: {
			fontSize: scaleFont(26, fontScale),
			fontWeight: "700",
			color: theme.textPrimary,
			marginBottom: 8,
		},
		subtitle: {
			fontSize: scaleFont(16, fontScale),
			color: theme.textSecondary,
			marginBottom: 24,
			lineHeight: scaleFont(22, fontScale),
		},
		inputLabel: {
			fontSize: scaleFont(14, fontScale),
			color: theme.textPrimary,
			marginBottom: 8,
			fontWeight: "600",
		},
		textInput: {
			borderWidth: 1,
			borderColor: theme.inputBorder,
			borderRadius: 12,
			paddingHorizontal: 16,
			paddingVertical: 12,
			fontSize: scaleFont(15, fontScale),
			color: theme.textPrimary,
			backgroundColor: theme.inputBackground,
			marginBottom: 16,
		},
		button: {
			backgroundColor: theme.accent,
			paddingVertical: 14,
			borderRadius: 12,
			alignItems: "center",
			marginBottom: 12,
		},
		buttonText: {
			color: theme.accentContrast,
			fontSize: scaleFont(16, fontScale),
			fontWeight: "600",
		},
		guestButton: {
			borderWidth: 1,
			borderColor: theme.accent,
			borderRadius: 12,
			paddingVertical: 12,
			minHeight: 48,
			alignItems: "center",
			justifyContent: "center",
		},
		guestButtonText: {
			color: theme.accent,
			fontSize: scaleFont(16, fontScale),
			fontWeight: "600",
		},
		rememberRow: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			marginBottom: 16,
		},
		rememberLabel: {
			fontSize: scaleFont(14, fontScale),
			color: theme.textPrimary,
			fontWeight: "600",
		},
		disabledButton: {
			opacity: 0.6,
		},
		helperText: {
			fontSize: scaleFont(13, fontScale),
			color: theme.textSecondary,
			marginBottom: 24,
			lineHeight: scaleFont(18, fontScale),
		},
		errorText: {
			color: theme.danger,
			fontSize: scaleFont(14, fontScale),
			marginBottom: 16,
		},
		ruleText: {
			fontSize: scaleFont(12, fontScale),
			color: theme.textMuted,
			marginTop: -8,
			marginBottom: 16,
			lineHeight: scaleFont(16, fontScale),
		},
		verificationSection: {
			marginBottom: 20,
			padding: 16,
			borderWidth: 1,
			borderColor: theme.border,
			borderRadius: 16,
			backgroundColor: theme.surface,
		},
		verificationHeaderRow: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			marginBottom: 12,
		},
		verificationDescription: {
			fontSize: scaleFont(12, fontScale),
			color: theme.textSecondary,
			marginBottom: 12,
			lineHeight: scaleFont(17, fontScale),
		},
		verificationSendButton: {
			paddingVertical: 8,
			paddingHorizontal: 14,
			borderRadius: 999,
			borderWidth: 1,
			borderColor: theme.accent,
		},
		verificationSendButtonText: {
			color: theme.accent,
			fontSize: scaleFont(13, fontScale),
			fontWeight: "600",
		},
		verificationCodeInput: {
			marginBottom: 12,
		},
		verificationActionButton: {
			backgroundColor: theme.accent,
			paddingVertical: 12,
			borderRadius: 12,
			alignItems: "center",
		},
		verificationActionButtonDisabled: {
			opacity: 0.6,
		},
		verificationActionButtonText: {
			color: theme.accentContrast,
			fontSize: scaleFont(14, fontScale),
			fontWeight: "600",
		},
		verificationHintText: {
			fontSize: scaleFont(12, fontScale),
			color: theme.textMuted,
			marginTop: 6,
			lineHeight: scaleFont(16, fontScale),
		},
		verificationSuccessText: {
			fontSize: scaleFont(12, fontScale),
			color: theme.success,
			marginTop: 6,
			fontWeight: "600",
		},
		modeSwitch: {
			flexDirection: "row",
			justifyContent: "center",
			alignItems: "center",
			marginTop: 20,
			gap: 6,
		},
		modeSwitchText: {
			fontSize: scaleFont(14, fontScale),
			color: theme.textSecondary,
		},
		modeSwitchAction: {
			fontSize: scaleFont(14, fontScale),
			color: theme.accent,
			fontWeight: "600",
		},
		footerNote: {
			fontSize: scaleFont(13, fontScale),
			color: theme.textSecondary,
			marginTop: 32,
			lineHeight: scaleFont(20, fontScale),
		},
		buttonLoadingRow: {
			flexDirection: "row",
			alignItems: "center",
			gap: 8,
		},
		buttonLoadingText: {
			color: theme.accentContrast,
			fontSize: scaleFont(16, fontScale),
			fontWeight: "600",
		},
		linkButton: {
			alignSelf: "center",
			marginVertical: 12,
		},
		linkButtonText: {
			fontSize: scaleFont(14, fontScale),
			color: theme.accent,
			fontWeight: "600",
		},
		resetBackdrop: {
			flex: 1,
			backgroundColor: "rgba(15,23,42,0.6)",
			alignItems: "center",
			justifyContent: "center",
			padding: 24,
		},
		resetContainer: {
			width: "100%",
			backgroundColor: theme.surface,
			borderRadius: 20,
			padding: 20,
			gap: 12,
		},
		resetTitle: {
			fontSize: scaleFont(18, fontScale),
			fontWeight: "700",
			color: theme.textPrimary,
		},
		resetDescription: {
			fontSize: scaleFont(13, fontScale),
			color: theme.textSecondary,
		},
		resetHelperText: {
			fontSize: scaleFont(12, fontScale),
			color: theme.textMuted,
			marginBottom: 4,
		},
		resetActions: {
			flexDirection: "row",
			gap: 12,
			marginTop: 8,
		},
		resetButton: {
			flex: 1,
			borderRadius: 12,
			paddingVertical: 12,
			alignItems: "center",
		},
		resetButtonPrimary: {
			backgroundColor: theme.accent,
		},
		resetButtonPrimaryText: {
			color: theme.accentContrast,
			fontSize: scaleFont(15, fontScale),
			fontWeight: "600",
		},
		resetButtonSecondary: {
			borderWidth: 1,
			borderColor: theme.border,
		},
		resetButtonSecondaryText: {
			color: theme.textPrimary,
			fontSize: scaleFont(15, fontScale),
			fontWeight: "600",
		},
		socialContainer: {
			marginTop: 20,
			marginBottom: 20,
			gap: 14,
		},
		socialDivider: {
			flexDirection: "row",
			alignItems: "center",
			gap: 10,
		},
		socialDividerLine: {
			flex: 1,
			height: 1,
			backgroundColor: theme.border,
		},
		socialDividerText: {
			fontSize: scaleFont(12, fontScale),
			color: theme.textMuted,
		},
		socialButtonGroup: {
			gap: 12,
		},
		socialButton: {
			borderRadius: 12,
			paddingVertical: 12,
			paddingHorizontal: 16,
			minHeight: 48,
			alignItems: "center",
			justifyContent: "center",
			backgroundColor: theme.textPrimary,
		},
		socialGoogleButton: {
			backgroundColor: theme.textPrimary,
		},
		socialAppleButton: {
			backgroundColor: "#000000",
		},
		socialButtonDisabled: {
			opacity: 0.6,
		},
		socialButtonContent: {
			flexDirection: "row",
			alignItems: "center",
			gap: 8,
		},
		socialButtonText: {
			color: theme.accentContrast,
			fontSize: scaleFont(15, fontScale),
			fontWeight: "600",
		},
		socialHelperText: {
			fontSize: scaleFont(12, fontScale),
			color: theme.textMuted,
			textAlign: "center",
		},
	});
