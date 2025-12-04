import { StyleSheet } from "react-native";

import type { AppThemeColors } from "@/theme/types";
import { scaleFont } from "@/theme/utils";

export const createLoginScreenStyles = (theme: AppThemeColors, fontScale: number) =>
    StyleSheet.create({
        safeArea: {
            flex: 1,
            backgroundColor: theme.background,
        },
        scrollContent: {
            flexGrow: 1,
            paddingHorizontal: 24,
            paddingTop: 48,
            paddingBottom: 32,
        },
        content: {
            flex: 1,
        },
        title: {
            fontSize: scaleFont(26, fontScale),
            fontWeight: "700",
            color: theme.textPrimary,
            marginBottom: 8,
        },
        subtitle: {
            fontSize: scaleFont(16, fontScale),
            color: theme.textSecondary,
            marginBottom: 24,
            lineHeight: scaleFont(22, fontScale),
        },
        inputLabel: {
            fontSize: scaleFont(14, fontScale),
            color: theme.textPrimary,
            marginBottom: 8,
            fontWeight: "600",
        },
        textInput: {
            borderWidth: 1,
            borderColor: theme.inputBorder,
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 12,
            fontSize: scaleFont(15, fontScale),
            color: theme.textPrimary,
            backgroundColor: theme.inputBackground,
            marginBottom: 16,
        },
        button: {
            backgroundColor: theme.accent,
            paddingVertical: 14,
            borderRadius: 12,
            alignItems: "center",
            marginBottom: 12,
        },
        buttonText: {
            color: theme.accentContrast,
            fontSize: scaleFont(16, fontScale),
            fontWeight: "600",
        },
        guestButton: {
            borderWidth: 1,
            borderColor: theme.accent,
            borderRadius: 12,
            paddingVertical: 12,
            minHeight: 48,
            alignItems: "center",
            justifyContent: "center",
        },
        guestButtonText: {
            color: theme.accent,
            fontSize: scaleFont(16, fontScale),
            fontWeight: "600",
        },
        rememberRow: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
        },
        rememberLabel: {
            fontSize: scaleFont(14, fontScale),
            color: theme.textPrimary,
            fontWeight: "600",
        },
        disabledButton: {
            opacity: 0.6,
        },
        helperText: {
            fontSize: scaleFont(13, fontScale),
            color: theme.textSecondary,
            marginBottom: 24,
            lineHeight: scaleFont(18, fontScale),
        },
        errorText: {
            color: theme.danger,
            fontSize: scaleFont(14, fontScale),
            marginBottom: 16,
        },
        ruleText: {
            fontSize: scaleFont(12, fontScale),
            color: theme.textMuted,
            marginTop: -8,
            marginBottom: 16,
            lineHeight: scaleFont(16, fontScale),
        },
        modeSwitch: {
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            marginTop: 20,
            gap: 6,
        },
        modeSwitchText: {
            fontSize: scaleFont(14, fontScale),
            color: theme.textSecondary,
        },
        modeSwitchAction: {
            fontSize: scaleFont(14, fontScale),
            color: theme.accent,
            fontWeight: "600",
        },
        footerNote: {
            fontSize: scaleFont(13, fontScale),
            color: theme.textSecondary,
            marginTop: 32,
            lineHeight: scaleFont(20, fontScale),
        },
        buttonLoadingRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
        },
        buttonLoadingText: {
            color: theme.accentContrast,
            fontSize: scaleFont(16, fontScale),
            fontWeight: "600",
        },
        linkButton: {
            alignSelf: "center",
            marginVertical: 12,
        },
        linkButtonText: {
            fontSize: scaleFont(14, fontScale),
            color: theme.accent,
            fontWeight: "600",
        },
    });
