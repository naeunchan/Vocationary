import { StyleSheet } from "react-native";

import { spacing } from "@/theme/spacing";
import type { AppThemeColors } from "@/theme/types";
import { scaleFont } from "@/theme/utils";

export const createTextFieldStyles = (theme: AppThemeColors, fontScale: number) =>
    StyleSheet.create({
        fieldWrap: {
            marginBottom: spacing.md,
        },
        label: {
            fontSize: scaleFont(14, fontScale),
            color: theme.textSecondary,
            fontWeight: "600",
            marginBottom: spacing.xs,
        },
        inputRow: {
            flexDirection: "row",
            alignItems: "center",
            borderWidth: 1,
            borderColor: theme.inputBorder,
            backgroundColor: theme.inputBackground,
            borderRadius: 14,
            paddingHorizontal: spacing.sm,
            minHeight: 52,
        },
        input: {
            flex: 1,
            fontSize: scaleFont(15, fontScale),
            color: theme.textPrimary,
            paddingVertical: spacing.sm,
        },
        iconButton: {
            paddingLeft: spacing.sm,
        },
        helperText: {
            fontSize: scaleFont(12, fontScale),
            color: theme.textSecondary,
            marginTop: spacing.sm,
        },
        errorText: {
            fontSize: scaleFont(12, fontScale),
            color: theme.danger,
            marginTop: spacing.xs,
        },
        inputError: {
            borderColor: theme.danger,
        },
    });
