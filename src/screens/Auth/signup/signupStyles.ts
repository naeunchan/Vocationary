import { StyleSheet } from "react-native";

import { spacing } from "@/theme/spacing";
import type { AppThemeColors } from "@/theme/types";
import { createTypography } from "@/theme/typography";
import { scaleFont } from "@/theme/utils";

export const createSignupStyles = (theme: AppThemeColors, fontScale: number) => {
    const typography = createTypography(fontScale);

    return StyleSheet.create({
        safeArea: {
            flex: 1,
            backgroundColor: theme.background,
        },
        container: {
            flex: 1,
        },
        content: {
            flex: 1,
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.lg,
        },
        headline: {
            ...typography.title,
            color: theme.textPrimary,
            marginBottom: spacing.sm,
        },
        subhead: {
            ...typography.subtitle,
            color: theme.textSecondary,
            lineHeight: scaleFont(22, fontScale),
        },
        helper: {
            marginTop: spacing.sm,
            color: theme.textSecondary,
            fontSize: scaleFont(13, fontScale),
        },
        sectionTitle: {
            fontSize: scaleFont(14, fontScale),
            color: theme.textSecondary,
            fontWeight: "600",
            marginBottom: spacing.xs,
        },
        stepText: {
            fontSize: scaleFont(13, fontScale),
            color: theme.textSecondary,
            fontWeight: "700",
            marginBottom: spacing.sm,
        },
        linkRow: {
            marginTop: spacing.sm,
            alignItems: "center",
            margin: spacing.md,
        },
        linkText: {
            color: theme.accent,
            fontSize: scaleFont(14, fontScale),
            fontWeight: "600",
        },
        errorText: {
            color: theme.danger,
            fontSize: scaleFont(13, fontScale),
            marginTop: spacing.xs,
        },
        infoBadge: {
            alignSelf: "flex-start",
            backgroundColor: theme.surface,
            borderRadius: 999,
            paddingHorizontal: spacing.sm,
            paddingVertical: 4,
            borderWidth: 1,
            borderColor: theme.inputBorder,
            marginBottom: spacing.md,
        },
        infoBadgeText: {
            color: theme.textSecondary,
            fontSize: scaleFont(12, fontScale),
            fontWeight: "600",
        },
        successIconWrap: {
            width: 96,
            height: 96,
            borderRadius: 48,
            backgroundColor: theme.surface,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: theme.inputBorder,
            marginBottom: spacing.lg,
        },
        successTitle: {
            ...typography.title,
            color: theme.textPrimary,
            textAlign: "center",
            marginBottom: spacing.sm,
        },
        successSubtitle: {
            ...typography.subtitle,
            color: theme.textSecondary,
            textAlign: "center",
            lineHeight: scaleFont(22, fontScale),
        },
    });
};
