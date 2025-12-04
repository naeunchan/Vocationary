import { StyleSheet } from "react-native";

import type { AppThemeColors } from "@/theme/types";
import { scaleFont } from "@/theme/utils";

export const createAppHelpModalStyles = (theme: AppThemeColors, fontScale: number) =>
    StyleSheet.create({
        backdrop: {
            flex: 1,
            backgroundColor: theme.isDark ? "rgba(15,23,42,0.85)" : "rgba(17,24,39,0.6)",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
        },
        container: {
            width: "100%",
            maxWidth: 440,
            backgroundColor: theme.surface,
            borderRadius: 20,
            paddingHorizontal: 24,
            paddingTop: 24,
            paddingBottom: 16,
            shadowColor: theme.shadow,
            shadowOpacity: 0.2,
            shadowRadius: 24,
            shadowOffset: { width: 0, height: 8 },
            elevation: 8,
        },
        scrollView: {
            maxHeight: 420,
        },
        scrollContent: {
            paddingBottom: 8,
        },
        title: {
            fontSize: scaleFont(20, fontScale),
            fontWeight: "700",
            color: theme.textPrimary,
            marginBottom: 12,
        },
        description: {
            fontSize: scaleFont(14, fontScale),
            color: theme.textSecondary,
            lineHeight: scaleFont(20, fontScale),
            marginBottom: 20,
        },
        section: {
            marginBottom: 16,
        },
        sectionTitle: {
            fontSize: scaleFont(16, fontScale),
            fontWeight: "600",
            color: theme.textPrimary,
            marginBottom: 6,
        },
        sectionBody: {
            fontSize: scaleFont(14, fontScale),
            color: theme.textSecondary,
            lineHeight: scaleFont(20, fontScale),
        },
        button: {
            marginTop: 12,
            backgroundColor: theme.accent,
            borderRadius: 12,
            paddingVertical: 14,
            alignItems: "center",
        },
        buttonPressed: {
            opacity: 0.85,
        },
        buttonText: {
            fontSize: scaleFont(15, fontScale),
            fontWeight: "600",
            color: theme.accentContrast,
        },
    });
