import { StyleSheet } from "react-native";

import { spacing } from "@/theme/spacing";
import type { AppThemeColors } from "@/theme/types";
import { scaleFont } from "@/theme/utils";

export const createPasswordRulesStyles = (theme: AppThemeColors, fontScale: number) =>
    StyleSheet.create({
        container: {
            backgroundColor: theme.surface,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: theme.inputBorder,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            marginTop: spacing.sm,
            gap: spacing.xs,
        },
        row: {
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.xs,
        },
        text: {
            fontSize: scaleFont(12, fontScale),
            color: theme.textSecondary,
        },
        textActive: {
            color: theme.textPrimary,
            fontWeight: "600",
        },
    });
