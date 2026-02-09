import { StyleSheet } from "react-native";

import type { AppThemeColors } from "@/theme/types";
import { scaleFont } from "@/theme/utils";

export const createRecoveryGuideStyles = (theme: AppThemeColors, fontScale: number) =>
    StyleSheet.create({
        safeArea: {
            flex: 1,
            backgroundColor: theme.background,
        },
        content: {
            paddingHorizontal: 20,
            paddingVertical: 24,
            gap: 12,
        },
        title: {
            fontSize: scaleFont(20, fontScale),
            fontWeight: "800",
            color: theme.textPrimary,
        },
        section: {
            gap: 8,
            marginTop: 8,
        },
        sectionTitle: {
            fontSize: scaleFont(15, fontScale),
            fontWeight: "700",
            color: theme.textPrimary,
        },
        body: {
            fontSize: scaleFont(14, fontScale),
            lineHeight: scaleFont(20, fontScale),
            color: theme.textSecondary,
        },
        primaryButton: {
            marginTop: 6,
            backgroundColor: theme.accent,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            paddingVertical: 13,
            paddingHorizontal: 16,
        },
        primaryButtonText: {
            color: theme.accentContrast,
            fontSize: scaleFont(15, fontScale),
            fontWeight: "700",
        },
        secondaryButton: {
            marginTop: 6,
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            paddingVertical: 13,
            paddingHorizontal: 16,
            backgroundColor: theme.surface,
        },
        secondaryButtonText: {
            color: theme.textPrimary,
            fontSize: scaleFont(15, fontScale),
            fontWeight: "600",
        },
    });
