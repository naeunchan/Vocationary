import { StyleSheet } from "react-native";

import type { AppThemeColors } from "@/theme/types";
import { scaleFont } from "@/theme/utils";

export const createReviewSessionScreenStyles = (theme: AppThemeColors, fontScale: number) =>
    StyleSheet.create({
        container: {
            gap: 18,
        },
        headerCard: {
            backgroundColor: theme.surface,
            borderRadius: 24,
            padding: 20,
            gap: 8,
        },
        eyebrow: {
            fontSize: scaleFont(12, fontScale),
            fontWeight: "700",
            letterSpacing: 0.8,
            textTransform: "uppercase",
            color: theme.textMuted,
        },
        title: {
            fontSize: scaleFont(24, fontScale),
            fontWeight: "800",
            color: theme.textPrimary,
        },
        subtitle: {
            fontSize: scaleFont(14, fontScale),
            lineHeight: scaleFont(20, fontScale),
            color: theme.textSecondary,
        },
        statsRow: {
            flexDirection: "row",
            gap: 12,
        },
        statCard: {
            flex: 1,
            backgroundColor: theme.cardMuted,
            borderRadius: 18,
            paddingVertical: 14,
            paddingHorizontal: 16,
            gap: 4,
        },
        statLabel: {
            fontSize: scaleFont(12, fontScale),
            color: theme.textSecondary,
        },
        statValue: {
            fontSize: scaleFont(18, fontScale),
            fontWeight: "800",
            color: theme.textPrimary,
        },
        wordCard: {
            backgroundColor: theme.surface,
            borderRadius: 28,
            padding: 24,
            gap: 14,
        },
        progressText: {
            fontSize: scaleFont(13, fontScale),
            fontWeight: "700",
            color: theme.accent,
        },
        word: {
            fontSize: scaleFont(32, fontScale),
            fontWeight: "800",
            color: theme.textPrimary,
        },
        phonetic: {
            fontSize: scaleFont(15, fontScale),
            color: theme.textSecondary,
        },
        definition: {
            fontSize: scaleFont(16, fontScale),
            lineHeight: scaleFont(24, fontScale),
            color: theme.textPrimary,
        },
        actionList: {
            gap: 10,
        },
        actionButton: {
            borderRadius: 18,
            paddingVertical: 16,
            paddingHorizontal: 18,
            alignItems: "center",
            justifyContent: "center",
        },
        primaryAction: {
            backgroundColor: theme.accent,
        },
        secondaryAction: {
            backgroundColor: theme.cardMuted,
        },
        actionButtonDisabled: {
            opacity: 0.6,
        },
        primaryActionText: {
            fontSize: scaleFont(16, fontScale),
            fontWeight: "800",
            color: theme.surface,
        },
        secondaryActionText: {
            fontSize: scaleFont(16, fontScale),
            fontWeight: "700",
            color: theme.textPrimary,
        },
        closeButton: {
            alignSelf: "center",
            paddingVertical: 8,
            paddingHorizontal: 12,
        },
        closeButtonText: {
            fontSize: scaleFont(14, fontScale),
            fontWeight: "700",
            color: theme.textSecondary,
        },
    });
