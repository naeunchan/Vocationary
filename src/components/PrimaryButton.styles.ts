import { StyleSheet } from "react-native";

import { spacing } from "@/theme/spacing";
import type { AppThemeColors } from "@/theme/types";
import { scaleFont } from "@/theme/utils";

export const createPrimaryButtonStyles = (theme: AppThemeColors, fontScale: number) =>
    StyleSheet.create({
        safeArea: {
            backgroundColor: theme.background,
        },
        container: {
            paddingHorizontal: spacing.lg,
            paddingBottom: spacing.md,
        },
        button: {
            backgroundColor: theme.accent,
            borderRadius: 16,
            paddingVertical: spacing.md,
            minHeight: 52,
            alignItems: "center",
            justifyContent: "center",
        },
        buttonDisabled: {
            opacity: 0.55,
        },
        buttonText: {
            color: theme.accentContrast,
            fontSize: scaleFont(16, fontScale),
            fontWeight: "700",
        },
        loadingRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.xs,
        },
        loadingText: {
            color: theme.accentContrast,
            fontSize: scaleFont(14, fontScale),
            fontWeight: "600",
        },
    });
