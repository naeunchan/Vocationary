import { StyleSheet } from "react-native";

import type { AppThemeColors } from "@/theme/types";
import { scaleFont } from "@/theme/utils";

export const createHomeHeaderStyles = (theme: AppThemeColors, fontScale: number) =>
    StyleSheet.create({
        container: {
            backgroundColor: theme.isDark ? theme.surface : theme.textPrimary,
            borderRadius: 28,
            padding: 24,
            shadowColor: theme.shadow,
            shadowOffset: { width: 0, height: 16 },
            shadowOpacity: 0.15,
            shadowRadius: 24,
            elevation: 8,
            gap: 12,
        },
        badge: {
            alignSelf: "flex-start",
            backgroundColor: theme.isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.14)",
            borderRadius: 999,
            paddingHorizontal: 14,
            paddingVertical: 6,
            color: theme.isDark ? theme.textSecondary : "#c7d2fe",
            fontSize: scaleFont(12, fontScale),
            fontWeight: "700",
            textTransform: "uppercase",
        },
        title: {
            fontSize: scaleFont(26, fontScale),
            fontWeight: "800",
            color: theme.isDark ? theme.textPrimary : theme.accentContrast,
            lineHeight: scaleFont(32, fontScale),
        },
        subtitle: {
            fontSize: scaleFont(15, fontScale),
            color: theme.isDark ? theme.textSecondary : "#cbd5f5",
        },
    });
