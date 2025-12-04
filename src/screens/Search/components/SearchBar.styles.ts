import { StyleSheet } from "react-native";

import type { AppThemeColors } from "@/theme/types";
import { scaleFont } from "@/theme/utils";

export const createSearchBarStyles = (theme: AppThemeColors, fontScale: number) =>
    StyleSheet.create({
        card: {
            backgroundColor: theme.surface,
            borderRadius: 24,
            padding: 20,
            shadowColor: theme.shadow,
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.08,
            shadowRadius: 14,
            elevation: 6,
            gap: 16,
        },
        cardHeader: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
        },
        cardTitle: {
            fontSize: scaleFont(16, fontScale),
            fontWeight: "700",
            color: theme.textPrimary,
        },
        iconSet: {
            flexDirection: "row",
            gap: 8,
        },
        iconBadge: {
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: theme.cardMuted,
            alignItems: "center",
            justifyContent: "center",
        },
        inputWrapper: {
            minHeight: 36,
        },
        searchInput: {
            flex: 1,
            minHeight: 36,
            fontSize: scaleFont(20, fontScale),
            color: theme.textPrimary,
            fontWeight: "500",
        },
        cardFooter: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
        },
        clearButton: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
        },
        clearButtonText: {
            color: theme.textSecondary,
            fontWeight: "600",
        },
        clearButtonTextDisabled: {
            color: theme.textMuted,
        },
        submitButton: {
            backgroundColor: theme.accent,
            borderRadius: 18,
            paddingVertical: 12,
            paddingHorizontal: 20,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
        },
        submitButtonText: {
            color: theme.accentContrast,
            fontSize: scaleFont(16, fontScale),
            fontWeight: "700",
        },
    });
