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
            paddingTop: 44,
            paddingBottom: 32,
        },
        content: {
            flex: 1,
        },
        title: {
            fontSize: scaleFont(28, fontScale),
            fontWeight: "800",
            color: theme.textPrimary,
            marginBottom: 6,
        },
        subtitle: {
            fontSize: scaleFont(16, fontScale),
            color: theme.textSecondary,
            marginBottom: 20,
            lineHeight: scaleFont(22, fontScale),
        },
        card: {
            backgroundColor: theme.surface,
            borderRadius: 20,
            paddingHorizontal: 18,
            paddingTop: 18,
            paddingBottom: 20,
            borderWidth: 1,
            borderColor: theme.inputBorder,
            shadowColor: theme.shadow,
            shadowOpacity: theme.isDark ? 0.35 : 0.08,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 8 },
            elevation: 4,
        },
        cardTitle: {
            fontSize: scaleFont(15, fontScale),
            color: theme.textSecondary,
            fontWeight: "700",
            marginBottom: 12,
        },
        socialButton: {
            borderWidth: 1,
            borderColor: theme.inputBorder,
            backgroundColor: theme.surface,
            paddingVertical: 12,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
        },
        socialButtonText: {
            color: theme.textPrimary,
            fontSize: scaleFont(15, fontScale),
            fontWeight: "700",
        },
        socialDividerRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            marginBottom: 20,
            marginTop: 4,
        },
        socialDividerLine: {
            flex: 1,
            height: StyleSheet.hairlineWidth,
            backgroundColor: theme.border,
        },
        socialDividerText: {
            color: theme.textSecondary,
            fontSize: scaleFont(12, fontScale),
            fontWeight: "700",
        },
        socialLoadingText: {
            color: theme.textPrimary,
            fontSize: scaleFont(15, fontScale),
            fontWeight: "600",
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
        flowLink: {
            marginTop: 10,
            alignItems: "center",
        },
        flowLinkText: {
            fontSize: scaleFont(14, fontScale),
            color: theme.accent,
            fontWeight: "600",
        },
        disabledButton: {
            opacity: 0.6,
        },
        helperText: {
            fontSize: scaleFont(13, fontScale),
            color: theme.textSecondary,
            marginBottom: 14,
            lineHeight: scaleFont(18, fontScale),
        },
        inputLabel: {
            fontSize: scaleFont(14, fontScale),
            color: theme.textSecondary,
            marginBottom: 8,
            marginTop: 14,
        },
        textInput: {
            borderWidth: 1,
            borderColor: theme.inputBorder,
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 12,
            fontSize: scaleFont(15, fontScale),
            color: theme.textPrimary,
            backgroundColor: theme.inputBackground,
        },
        ruleText: {
            fontSize: scaleFont(12, fontScale),
            color: theme.textSecondary,
            marginTop: 6,
        },
        errorText: {
            color: theme.danger,
            fontSize: scaleFont(14, fontScale),
            marginBottom: 16,
        },
        button: {
            backgroundColor: theme.accent,
            borderRadius: 12,
            paddingVertical: 14,
            alignItems: "center",
            justifyContent: "center",
            marginTop: 24,
        },
        buttonText: {
            color: theme.accentContrast,
            fontSize: scaleFont(16, fontScale),
            fontWeight: "700",
        },
        guestSection: {
            marginTop: 18,
        },
        dividerRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            marginTop: 18,
            marginBottom: 10,
        },
        dividerLine: {
            flex: 1,
            height: StyleSheet.hairlineWidth,
            backgroundColor: theme.border,
        },
        dividerText: {
            color: theme.textMuted,
            fontSize: scaleFont(12, fontScale),
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
    });
