import { StyleSheet } from "react-native";

import type { AppThemeColors } from "@/theme/types";
import { scaleFont } from "@/theme/utils";

export const createDeleteAccountScreenStyles = (theme: AppThemeColors, fontScale: number) =>
    StyleSheet.create({
        safeArea: {
            flex: 1,
            backgroundColor: theme.background,
        },
        scrollContent: {
            padding: 24,
            gap: 20,
        },
        card: {
            backgroundColor: theme.surface,
            borderRadius: 24,
            padding: 24,
            gap: 14,
            borderWidth: 1,
            borderColor: theme.border,
        },
        title: {
            fontSize: scaleFont(20, fontScale),
            fontWeight: "700",
            color: theme.textPrimary,
        },
        description: {
            fontSize: scaleFont(14, fontScale),
            lineHeight: scaleFont(20, fontScale),
            color: theme.textSecondary,
        },
        highlight: {
            color: theme.danger,
            fontWeight: "600",
        },
        checkRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            paddingHorizontal: 8,
        },
        checkLabel: {
            flex: 1,
            fontSize: scaleFont(14, fontScale),
            color: theme.textPrimary,
            lineHeight: scaleFont(20, fontScale),
        },
        errorText: {
            color: theme.danger,
            fontSize: scaleFont(13, fontScale),
        },
        button: {
            backgroundColor: theme.danger,
            borderRadius: 16,
            paddingVertical: 14,
            alignItems: "center",
        },
        buttonDisabled: {
            opacity: 0.6,
        },
        buttonText: {
            color: theme.accentContrast,
            fontSize: scaleFont(16, fontScale),
            fontWeight: "700",
        },
    });
