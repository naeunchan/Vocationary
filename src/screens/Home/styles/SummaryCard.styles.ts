import { StyleSheet } from "react-native";

import type { AppThemeColors } from "@/theme/types";
import { scaleFont } from "@/theme/utils";

export const createSummaryCardStyles = (theme: AppThemeColors, fontScale: number) =>
    StyleSheet.create({
        card: {
            backgroundColor: theme.surface,
            borderRadius: 26,
            padding: 24,
            shadowColor: theme.shadow,
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.08,
            shadowRadius: 18,
            elevation: 6,
            gap: 16,
        },
        header: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
        },
        sectionLabel: {
            fontSize: scaleFont(13, fontScale),
            color: theme.textMuted,
            fontWeight: "700",
            textTransform: "uppercase",
            letterSpacing: 0.8,
            marginBottom: 6,
        },
        greeting: {
            fontSize: scaleFont(18, fontScale),
            fontWeight: "700",
            color: theme.textPrimary,
        },
        modeBadge: {
            backgroundColor: theme.chipBackground,
            borderRadius: 999,
            paddingHorizontal: 14,
            paddingVertical: 6,
        },
        modeBadgeText: {
            fontSize: scaleFont(13, fontScale),
            fontWeight: "700",
            color: theme.chipText,
        },
        grid: {
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 12,
        },
        statCard: {
            flexGrow: 1,
            minWidth: "45%",
            backgroundColor: theme.cardMuted,
            borderRadius: 18,
            paddingVertical: 16,
            paddingHorizontal: 18,
        },
        statLabel: {
            fontSize: scaleFont(13, fontScale),
            color: theme.textSecondary,
            marginBottom: 6,
        },
        statValue: {
            fontSize: scaleFont(20, fontScale),
            fontWeight: "800",
            color: theme.textPrimary,
        },
        reviewPanel: {
            backgroundColor: theme.cardMuted,
            borderRadius: 22,
            padding: 18,
            gap: 14,
        },
        reviewPanelText: {
            gap: 6,
        },
        reviewTitle: {
            fontSize: scaleFont(17, fontScale),
            fontWeight: "800",
            color: theme.textPrimary,
        },
        reviewBody: {
            fontSize: scaleFont(14, fontScale),
            lineHeight: scaleFont(20, fontScale),
            color: theme.textSecondary,
        },
        reviewButton: {
            backgroundColor: theme.accent,
            borderRadius: 16,
            paddingVertical: 14,
            alignItems: "center",
            justifyContent: "center",
        },
        reviewButtonText: {
            fontSize: scaleFont(15, fontScale),
            fontWeight: "800",
            color: theme.surface,
        },
    });
