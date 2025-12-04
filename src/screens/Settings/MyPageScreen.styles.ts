import { StyleSheet } from "react-native";

import type { AppThemeColors } from "@/theme/types";
import { scaleFont } from "@/theme/utils";

export const createMyPageStyles = (theme: AppThemeColors, fontScale: number) =>
    StyleSheet.create({
        safeArea: {
            flex: 1,
            backgroundColor: theme.backgroundAlt,
        },
        scrollContent: {
            flexGrow: 1,
            paddingHorizontal: 20,
            gap: 24,
            paddingBottom: 24,
        },
        header: {
            gap: 6,
        },
        title: {
            fontSize: scaleFont(24, fontScale),
            fontWeight: "700",
            color: theme.textPrimary,
        },
        subtitle: {
            fontSize: scaleFont(15, fontScale),
            color: theme.textSecondary,
        },
        caption: {
            fontSize: scaleFont(13, fontScale),
            color: theme.textMuted,
        },
        section: {
            backgroundColor: theme.surface,
            borderRadius: 16,
            paddingVertical: 20,
            paddingHorizontal: 18,
            borderWidth: 1,
            borderColor: theme.border,
            gap: 14,
            shadowColor: theme.shadow,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.04,
            shadowRadius: 10,
            elevation: 2,
        },
        deleteCard: {
            marginTop: 8,
            padding: 16,
            borderRadius: 14,
            backgroundColor: theme.surfaceMuted,
            borderWidth: 1,
            borderColor: theme.border,
            gap: 12,
        },
        sectionTitle: {
            fontSize: scaleFont(18, fontScale),
            fontWeight: "700",
            color: theme.textPrimary,
        },
        sectionDescription: {
            fontSize: scaleFont(14, fontScale),
            color: theme.textSecondary,
            lineHeight: scaleFont(20, fontScale),
        },
        actionList: {
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 16,
            overflow: "hidden",
        },
        actionItem: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingVertical: 18,
            paddingHorizontal: 18,
            backgroundColor: theme.surface,
        },
        actionTextContainer: {
            gap: 4,
            flex: 1,
        },
        actionTitle: {
            fontSize: scaleFont(16, fontScale),
            fontWeight: "600",
            color: theme.textPrimary,
        },
        actionSubtitle: {
            fontSize: scaleFont(13, fontScale),
            color: theme.textSecondary,
        },
        actionChevron: {
            fontSize: scaleFont(20, fontScale),
            color: theme.textMuted,
            marginLeft: 12,
        },
        actionDivider: {
            height: 1,
            backgroundColor: theme.border,
            marginHorizontal: 18,
        },
        input: {
            borderWidth: 1,
            borderColor: theme.inputBorder,
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 12,
            fontSize: scaleFont(16, fontScale),
            color: theme.textPrimary,
            backgroundColor: theme.inputBackground,
        },
        inputRow: {
            flexDirection: "row",
            gap: 12,
            alignItems: "center",
        },
        inputFlex: {
            flex: 1,
        },
        checkButton: {
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 12,
            justifyContent: "center",
            alignItems: "center",
            minWidth: 96,
            backgroundColor: theme.surfaceMuted,
        },
        checkButtonDisabled: {
            opacity: 0.6,
        },
        checkButtonText: {
            fontSize: scaleFont(13, fontScale),
            fontWeight: "600",
            color: theme.textPrimary,
        },
        errorText: {
            fontSize: scaleFont(13, fontScale),
            color: theme.danger,
        },
        successText: {
            fontSize: scaleFont(13, fontScale),
            color: theme.success,
        },
        submitButton: {
            backgroundColor: theme.accent,
            borderRadius: 12,
            paddingVertical: 14,
            alignItems: "center",
        },
        submitButtonDisabled: {
            opacity: 0.7,
        },
        submitButtonText: {
            fontSize: scaleFont(16, fontScale),
            fontWeight: "600",
            color: theme.accentContrast,
        },
        deleteButton: {
            borderRadius: 12,
            paddingVertical: 12,
            alignItems: "center",
            backgroundColor: theme.danger,
        },
        deleteButtonDisabled: {
            opacity: 0.7,
        },
        deleteButtonText: {
            color: theme.accentContrast,
            fontSize: scaleFont(15, fontScale),
            fontWeight: "700",
        },
        deleteDescription: {
            fontSize: scaleFont(13, fontScale),
            color: theme.textSecondary,
            lineHeight: scaleFont(18, fontScale),
        },
    });
