import { StyleSheet } from "react-native";

import { spacing } from "@/theme/spacing";
import type { AppThemeColors } from "@/theme/types";
import { scaleFont } from "@/theme/utils";

export const createAppHeaderStyles = (theme: AppThemeColors, fontScale: number) =>
    StyleSheet.create({
        safeArea: {
            backgroundColor: theme.background,
        },
        container: {
            flexDirection: "row",
            alignItems: "center",
            height: 52,
            paddingHorizontal: spacing.sm,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: theme.border,
        },
        backButton: {
            padding: spacing.xs,
        },
        backPlaceholder: {
            width: 40,
        },
        title: {
            flex: 1,
            fontSize: scaleFont(16, fontScale),
            fontWeight: "700",
            color: theme.textPrimary,
            textAlign: "left",
            marginLeft: spacing.xs,
        },
        stepPill: {
            backgroundColor: theme.surface,
            paddingHorizontal: spacing.sm,
            paddingVertical: 4,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: theme.inputBorder,
            minWidth: 60,
            alignItems: "center",
        },
        stepText: {
            fontSize: scaleFont(12, fontScale),
            fontWeight: "700",
            color: theme.textSecondary,
        },
        stepPlaceholder: {
            width: 60,
        },
    });
