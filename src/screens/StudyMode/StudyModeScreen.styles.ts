import { StyleSheet } from "react-native";

import type { AppThemeColors } from "@/theme/types";
import { scaleFont } from "@/theme/utils";

export const createStudyModeScreenStyles = (theme: AppThemeColors, fontScale: number) =>
    StyleSheet.create({
        container: {
            backgroundColor: theme.surface,
            borderRadius: 24,
            padding: 20,
            gap: 16,
            shadowColor: theme.shadow,
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.08,
            shadowRadius: 16,
            elevation: 6,
        },
        header: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 12,
        },
        headerTextWrap: {
            flex: 1,
            gap: 8,
        },
        statusPill: {
            alignSelf: "flex-start",
            borderRadius: 999,
            paddingHorizontal: 12,
            paddingVertical: 6,
        },
        statusPillHealthy: {
            backgroundColor: theme.chipBackground,
        },
        statusPillWarning: {
            backgroundColor: theme.warning,
        },
        statusPillMuted: {
            backgroundColor: theme.cardMuted,
        },
        statusPillText: {
            fontSize: scaleFont(12, fontScale),
            fontWeight: "700",
            color: theme.textPrimary,
        },
        title: {
            fontSize: scaleFont(20, fontScale),
            fontWeight: "800",
            color: theme.textPrimary,
        },
        subtitle: {
            fontSize: scaleFont(14, fontScale),
            color: theme.textSecondary,
            lineHeight: scaleFont(20, fontScale),
        },
        closeButton: {
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 999,
            backgroundColor: theme.cardMuted,
        },
        closeButtonText: {
            fontSize: scaleFont(13, fontScale),
            fontWeight: "700",
            color: theme.textPrimary,
        },
        loadingBody: {
            gap: 12,
            alignItems: "center",
            paddingVertical: 16,
        },
        loadingText: {
            fontSize: scaleFont(14, fontScale),
            color: theme.textSecondary,
        },
        statsRow: {
            flexDirection: "row",
            gap: 10,
            flexWrap: "wrap",
        },
        statChip: {
            borderRadius: 999,
            paddingHorizontal: 12,
            paddingVertical: 8,
            backgroundColor: theme.cardMuted,
        },
        statChipText: {
            fontSize: scaleFont(13, fontScale),
            fontWeight: "700",
            color: theme.textPrimary,
        },
        promptCard: {
            backgroundColor: theme.cardMuted,
            borderRadius: 20,
            padding: 18,
            gap: 8,
        },
        promptLabel: {
            fontSize: scaleFont(12, fontScale),
            fontWeight: "700",
            color: theme.textSecondary,
        },
        promptText: {
            fontSize: scaleFont(18, fontScale),
            fontWeight: "700",
            color: theme.textPrimary,
            lineHeight: scaleFont(26, fontScale),
        },
        choices: {
            gap: 10,
        },
        choiceButton: {
            borderRadius: 18,
            paddingHorizontal: 16,
            paddingVertical: 14,
            borderWidth: 1,
            borderColor: theme.border,
            backgroundColor: theme.surface,
        },
        choiceButtonSelected: {
            borderColor: theme.accent,
            backgroundColor: theme.chipBackground,
        },
        choiceButtonCorrect: {
            borderColor: theme.success,
            backgroundColor: theme.cardMuted,
        },
        choiceButtonIncorrect: {
            borderColor: theme.danger,
            backgroundColor: theme.cardMuted,
        },
        choiceLabel: {
            fontSize: scaleFont(15, fontScale),
            fontWeight: "600",
            color: theme.textPrimary,
            lineHeight: scaleFont(22, fontScale),
        },
        feedbackCard: {
            borderRadius: 20,
            padding: 18,
            gap: 8,
            backgroundColor: theme.cardMuted,
        },
        feedbackTitle: {
            fontSize: scaleFont(16, fontScale),
            fontWeight: "800",
            color: theme.textPrimary,
        },
        feedbackDescription: {
            fontSize: scaleFont(14, fontScale),
            color: theme.textSecondary,
            lineHeight: scaleFont(20, fontScale),
        },
        actionRow: {
            flexDirection: "row",
            gap: 10,
        },
        primaryButton: {
            flex: 1,
            borderRadius: 18,
            paddingVertical: 14,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.accent,
        },
        secondaryButton: {
            flex: 1,
            borderRadius: 18,
            paddingVertical: 14,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.cardMuted,
        },
        primaryButtonText: {
            fontSize: scaleFont(14, fontScale),
            fontWeight: "800",
            color: theme.accentContrast,
        },
        secondaryButtonText: {
            fontSize: scaleFont(14, fontScale),
            fontWeight: "700",
            color: theme.textPrimary,
        },
        summaryCard: {
            backgroundColor: theme.cardMuted,
            borderRadius: 20,
            padding: 18,
            gap: 8,
        },
        summaryTitle: {
            fontSize: scaleFont(18, fontScale),
            fontWeight: "800",
            color: theme.textPrimary,
        },
        summaryDescription: {
            fontSize: scaleFont(14, fontScale),
            color: theme.textSecondary,
            lineHeight: scaleFont(20, fontScale),
        },
    });
