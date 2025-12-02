import { StyleSheet } from "react-native";
import type { AppThemeColors } from "@/theme/types";
import { scaleFont } from "@/theme/utils";

export const createSearchScreenStyles = (theme: AppThemeColors, fontScale: number) =>
	StyleSheet.create({
		safeArea: {
			flex: 1,
			backgroundColor: theme.background,
		},
		scrollContent: {
			paddingHorizontal: 20,
			paddingTop: 24,
			paddingBottom: 40,
			gap: 20,
		},
		header: {
			gap: 4,
		},
		title: {
			fontSize: scaleFont(28, fontScale),
			fontWeight: "800",
			color: theme.textPrimary,
		},
		subtitle: {
			fontSize: scaleFont(15, fontScale),
			color: theme.textSecondary,
		},
		modeSection: {
			backgroundColor: theme.surface,
			borderRadius: 24,
			padding: 20,
			shadowColor: theme.shadow,
			shadowOffset: { width: 0, height: 8 },
			shadowOpacity: 0.08,
			shadowRadius: 12,
			elevation: 6,
			gap: 12,
		},
		sectionLabel: {
			fontSize: scaleFont(14, fontScale),
			fontWeight: "700",
			color: theme.textSecondary,
		},
		modeButtons: {
			flexDirection: "row",
			gap: 12,
		},
		modeButton: {
			flex: 1,
			paddingVertical: 12,
			borderRadius: 16,
			backgroundColor: theme.cardMuted,
			alignItems: "center",
			justifyContent: "center",
		},
		modeButtonActive: {
			backgroundColor: theme.accent,
		},
		modeButtonDisabled: {
			opacity: 0.6,
		},
		modeButtonLabel: {
			fontSize: scaleFont(15, fontScale),
			fontWeight: "700",
			color: theme.textPrimary,
		},
		modeButtonLabelActive: {
			color: theme.accentContrast,
		},
		modeButtonLabelDisabled: {
			color: theme.textMuted,
		},
		aiNotice: {
			backgroundColor: theme.cardMuted,
			borderRadius: 16,
			padding: 14,
			gap: 6,
		},
		aiNoticeTitle: {
			fontSize: scaleFont(14, fontScale),
			fontWeight: "700",
			color: theme.textPrimary,
		},
		aiNoticeText: {
			fontSize: scaleFont(13, fontScale),
			color: theme.textSecondary,
			lineHeight: scaleFont(19, fontScale),
		},
		resultsWrapper: {
			marginTop: 8,
		},
		placeholderCard: {
			backgroundColor: theme.surface,
			borderRadius: 24,
			padding: 24,
			gap: 8,
			shadowColor: theme.shadow,
			shadowOffset: { width: 0, height: 10 },
			shadowOpacity: 0.08,
			shadowRadius: 14,
			elevation: 6,
		},
		placeholderTitle: {
			fontSize: scaleFont(18, fontScale),
			fontWeight: "700",
			color: theme.textPrimary,
		},
		placeholderSubtitle: {
			fontSize: scaleFont(14, fontScale),
			color: theme.textSecondary,
		},
		centered: {
			alignItems: "center",
			justifyContent: "center",
			paddingVertical: 24,
		},
		errorText: {
			color: theme.danger,
			fontWeight: "600",
		},
		errorCard: {
			borderRadius: 20,
			padding: 20,
			gap: 10,
			backgroundColor: theme.surface,
			borderWidth: 1,
			borderColor: theme.border,
		},
		errorTitle: {
			fontSize: scaleFont(16, fontScale),
			fontWeight: "700",
			color: theme.textPrimary,
		},
		errorDescription: {
			fontSize: scaleFont(14, fontScale),
			color: theme.textSecondary,
			lineHeight: scaleFont(20, fontScale),
		},
		retryButton: {
			alignSelf: "flex-start",
			marginTop: 4,
			borderRadius: 999,
			paddingHorizontal: 16,
			paddingVertical: 8,
			backgroundColor: theme.accent,
		},
		retryButtonLabel: {
			color: theme.accentContrast,
			fontSize: scaleFont(13, fontScale),
			fontWeight: "700",
		},
		historyCard: {
			backgroundColor: theme.surface,
			borderRadius: 24,
			padding: 20,
			gap: 12,
			shadowColor: theme.shadow,
			shadowOffset: { width: 0, height: 8 },
			shadowOpacity: 0.06,
			shadowRadius: 12,
			elevation: 4,
		},
		historyHeader: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
		},
		historyClearButton: {
			paddingHorizontal: 8,
			paddingVertical: 6,
		},
		historyClearText: {
			fontSize: scaleFont(13, fontScale),
			fontWeight: "600",
			color: theme.textMuted,
		},
		historyList: {
			gap: 10,
		},
		historyItem: {
			flexDirection: "row",
			alignItems: "center",
			paddingVertical: 10,
			paddingHorizontal: 12,
			borderRadius: 18,
			backgroundColor: theme.cardMuted,
		},
		historyIconWrapper: {
			width: 30,
			height: 30,
			borderRadius: 15,
			backgroundColor: theme.chipBackground,
			alignItems: "center",
			justifyContent: "center",
			marginRight: 10,
		},
		historyTexts: {
			flex: 1,
		},
		historyWord: {
			fontSize: scaleFont(15, fontScale),
			fontWeight: "700",
			color: theme.textPrimary,
		},
		historyMeta: {
			fontSize: scaleFont(12, fontScale),
			color: theme.textSecondary,
			marginTop: 2,
		},
	});
