import { StyleSheet } from "react-native";

import type { AppThemeColors } from "@/theme/types";
import { scaleFont } from "@/theme/utils";

export const createGoalProgressCardStyles = (theme: AppThemeColors, fontScale: number) =>
    StyleSheet.create({
        card: {
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 12,
        },
        metricCard: {
            flexGrow: 1,
            minWidth: "30%",
            backgroundColor: theme.surface,
            borderRadius: 22,
            paddingVertical: 18,
            paddingHorizontal: 16,
            gap: 6,
            shadowColor: theme.shadow,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.06,
            shadowRadius: 12,
            elevation: 4,
        },
        metricLabel: {
            fontSize: scaleFont(12, fontScale),
            fontWeight: "700",
            color: theme.textMuted,
            textTransform: "uppercase",
            letterSpacing: 0.5,
        },
        metricValue: {
            fontSize: scaleFont(20, fontScale),
            fontWeight: "800",
            color: theme.textPrimary,
        },
        metricHelper: {
            fontSize: scaleFont(13, fontScale),
            lineHeight: scaleFont(18, fontScale),
            color: theme.textSecondary,
        },
    });
