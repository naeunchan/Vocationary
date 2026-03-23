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
            paddingHorizontal: 28,
            paddingTop: 18,
            paddingBottom: 28,
        },
        content: {
            flexGrow: 1,
            width: "100%",
            maxWidth: 460,
            alignSelf: "center",
            justifyContent: "space-between",
            gap: 28,
        },
        hero: {
            width: "100%",
            alignItems: "center",
            justifyContent: "center",
            paddingTop: 60,
        },
        brandText: {
            fontSize: scaleFont(28, fontScale),
            fontWeight: "700",
            fontFamily: "SB_Aggro_B",
            color: theme.accent,
            textAlign: "center",
        },
        title: {
            fontSize: scaleFont(48, fontScale),
            fontWeight: "800",
            color: theme.textPrimary,
            lineHeight: scaleFont(52, fontScale),
            textAlign: "center",
        },
        subtitle: {
            fontSize: scaleFont(15, fontScale),
            color: theme.textSecondary,
            marginTop: 12,
            lineHeight: scaleFont(22, fontScale),
            textAlign: "center",
            maxWidth: 320,
        },
        card: {
            marginTop: 4,
        },
        cardTitle: {
            fontSize: scaleFont(16, fontScale),
            color: theme.textPrimary,
            fontWeight: "700",
            marginBottom: 10,
        },
        modeSwitch: {
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 6,
            paddingVertical: 4,
        },
        modeSwitchText: {
            fontSize: scaleFont(15, fontScale),
            color: theme.textPrimary,
        },
        modeSwitchAction: {
            fontSize: scaleFont(15, fontScale),
            color: theme.accent,
            fontWeight: "700",
        },
        recoveryLink: {
            marginTop: 10,
            alignSelf: "flex-end",
        },
        recoveryLinkText: {
            fontSize: scaleFont(15, fontScale),
            color: theme.accent,
            fontWeight: "600",
        },
        disabledButton: {
            opacity: 0.6,
        },
        helperText: {
            fontSize: scaleFont(14, fontScale),
            color: theme.textSecondary,
            lineHeight: scaleFont(21, fontScale),
        },
        previewPanel: {
            backgroundColor: withAlpha(theme.surface, theme.isDark ? 0.7 : 0.9),
            borderRadius: 18,
            paddingHorizontal: 18,
            paddingVertical: 18,
            borderWidth: 1,
            borderColor: theme.inputBorder,
            gap: 4,
        },
        fieldStack: {
            gap: 20,
        },
        fieldGroup: {
            gap: 8,
        },
        inputLabel: {
            fontSize: scaleFont(15, fontScale),
            color: theme.textPrimary,
            fontWeight: "600",
        },
        textInput: {
            borderWidth: 1,
            borderColor: theme.inputBorder,
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 14,
            fontSize: scaleFont(15, fontScale),
            color: theme.textPrimary,
            backgroundColor: theme.surface,
        },
        errorText: {
            color: theme.danger,
            fontSize: scaleFont(13, fontScale),
            lineHeight: scaleFont(18, fontScale),
        },
        button: {
            backgroundColor: theme.accent,
            borderRadius: 12,
            paddingVertical: 15,
            alignItems: "center",
            justifyContent: "center",
            marginTop: 28,
        },
        buttonText: {
            color: theme.accentContrast,
            fontSize: scaleFont(16, fontScale),
            fontWeight: "700",
        },
        buttonLoadingText: {
            color: theme.accentContrast,
            fontSize: scaleFont(15, fontScale),
            fontWeight: "700",
        },
        guestSection: {
            marginTop: 28,
            alignItems: "center",
            gap: 16,
        },
        sectionLabel: {
            fontSize: scaleFont(15, fontScale),
            color: theme.textSecondary,
            lineHeight: scaleFont(20, fontScale),
            textAlign: "center",
        },
        buttonLoadingRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
        },
        footer: {
            alignItems: "center",
            paddingBottom: 4,
        },
        guestButton: {
            minWidth: 220,
            maxWidth: "100%",
            borderWidth: 1,
            borderColor: theme.inputBorder,
            borderRadius: 999,
            backgroundColor: theme.surface,
            alignItems: "center",
            justifyContent: "center",
            paddingVertical: 13,
            paddingHorizontal: 24,
        },
        guestButtonText: {
            color: theme.textPrimary,
            fontSize: scaleFont(15, fontScale),
            fontWeight: "700",
        },
    });

function withAlpha(hexColor: string, alpha: number) {
    const normalized = hexColor.replace("#", "");
    const full =
        normalized.length === 3
            ? normalized
                  .split("")
                  .map((char) => char + char)
                  .join("")
            : normalized;
    const value = Number.parseInt(full, 16);
    const r = (value >> 16) & 255;
    const g = (value >> 8) & 255;
    const b = value & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
