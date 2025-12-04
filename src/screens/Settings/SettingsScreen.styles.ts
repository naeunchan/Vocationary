import { StyleSheet } from "react-native";

import type { AppThemeColors } from "@/theme/types";
import { scaleFont } from "@/theme/utils";

export const createStyles = (theme: AppThemeColors, fontScale: number) =>
    StyleSheet.create({
        safeArea: {
            flex: 1,
            backgroundColor: theme.background,
        },
        scrollContent: {
            paddingHorizontal: 16,
            paddingVertical: 24,
            gap: 24,
        },
        profileCard: {
            backgroundColor: theme.surface,
            borderRadius: 20,
            padding: 20,
            flexDirection: "row",
            alignItems: "center",
            gap: 16,
            shadowColor: theme.shadow,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.08,
            shadowRadius: 16,
            elevation: 4,
        },
        profileAvatar: {
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: theme.accent,
            alignItems: "center",
            justifyContent: "center",
        },
        profileAvatarInitial: {
            color: theme.accentContrast,
            fontSize: scaleFont(20, fontScale),
            fontWeight: "700",
        },
        profileInfo: {
            flex: 1,
        },
        profileName: {
            fontSize: scaleFont(18, fontScale),
            fontWeight: "700",
            color: theme.textPrimary,
        },
        profileSubtitle: {
            fontSize: scaleFont(14, fontScale),
            color: theme.textSecondary,
            marginTop: 2,
        },
        profileAction: {
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 16,
            backgroundColor: theme.chipBackground,
        },
        profileActionText: {
            fontSize: scaleFont(13, fontScale),
            fontWeight: "600",
            color: theme.chipText,
        },
        section: {
            gap: 8,
        },
        sectionLabel: {
            fontSize: scaleFont(13, fontScale),
            color: theme.textMuted,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            marginLeft: 4,
        },
        sectionCard: {
            backgroundColor: theme.surface,
            borderRadius: 18,
            shadowColor: theme.shadow,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.06,
            shadowRadius: 12,
            elevation: 3,
            overflow: "hidden",
        },
        row: {
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingVertical: 14,
            backgroundColor: theme.surface,
        },
        rowBorder: {
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
        },
        rowLabel: {
            flex: 1,
            fontSize: scaleFont(16, fontScale),
            color: theme.textPrimary,
        },
        rowValue: {
            fontSize: scaleFont(16, fontScale),
            color: theme.textSecondary,
        },
        rowChevron: {
            fontSize: scaleFont(20, fontScale),
            color: theme.textMuted,
        },
        rowDisabled: {
            opacity: 0.6,
        },
        rowDangerText: {
            color: theme.danger,
        },
        guestCard: {
            backgroundColor: theme.surface,
            borderRadius: 18,
            padding: 20,
            gap: 12,
            shadowColor: theme.shadow,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.06,
            shadowRadius: 12,
            elevation: 3,
        },
        guestTitle: {
            fontSize: scaleFont(17, fontScale),
            fontWeight: "700",
            color: theme.textPrimary,
        },
        guestDescription: {
            fontSize: scaleFont(14, fontScale),
            color: theme.textSecondary,
            lineHeight: scaleFont(20, fontScale),
        },
        infoCard: {
            backgroundColor: theme.surface,
            borderRadius: 18,
            padding: 18,
            gap: 8,
            shadowColor: theme.shadow,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.05,
            shadowRadius: 10,
            elevation: 2,
        },
        infoCardTitle: {
            fontSize: scaleFont(15, fontScale),
            fontWeight: "700",
            color: theme.textPrimary,
        },
        infoCardBody: {
            fontSize: scaleFont(13, fontScale),
            color: theme.textSecondary,
            lineHeight: scaleFont(19, fontScale),
        },
        primaryCta: {
            backgroundColor: theme.accent,
            borderRadius: 14,
            paddingVertical: 14,
            alignItems: "center",
        },
        primaryCtaText: {
            color: theme.accentContrast,
            fontSize: scaleFont(16, fontScale),
            fontWeight: "600",
        },
        secondaryCta: {
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 14,
            paddingVertical: 14,
            alignItems: "center",
        },
        secondaryCtaText: {
            color: theme.textPrimary,
            fontSize: scaleFont(16, fontScale),
            fontWeight: "600",
        },
        preferenceTitle: {
            fontSize: scaleFont(15, fontScale),
            fontWeight: "700",
            color: theme.textPrimary,
        },
        preferenceHeader: {
            paddingHorizontal: 16,
            paddingTop: 18,
            paddingBottom: 6,
            gap: 4,
        },
        preferenceDescription: {
            fontSize: scaleFont(13, fontScale),
            color: theme.textSecondary,
        },
        appearanceOptions: {
            flexDirection: "row",
            paddingHorizontal: 16,
            paddingBottom: 16,
            gap: 12,
        },
        appearanceOption: {
            flex: 1,
            borderRadius: 18,
            padding: 12,
            borderWidth: 1,
            borderColor: theme.border,
            backgroundColor: theme.surfaceMuted,
            alignItems: "center",
            gap: 10,
        },
        appearanceOptionActive: {
            borderColor: theme.accent,
            shadowColor: theme.shadow,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.12,
            shadowRadius: 12,
            elevation: 3,
        },
        appearancePreview: {
            width: "100%",
            aspectRatio: 3 / 4,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: theme.border,
            overflow: "hidden",
        },
        previewStatusBar: {
            height: 12,
            backgroundColor: "#f1f5f9",
        },
        previewStatusBarDark: {
            backgroundColor: "#111827",
        },
        previewContent: {
            flex: 1,
            padding: 10,
            gap: 6,
            backgroundColor: "#ffffff",
        },
        previewContentDark: {
            backgroundColor: "#1f2937",
        },
        previewBlock: {
            height: 18,
            borderRadius: 8,
            backgroundColor: "#cbd5f5",
        },
        previewBlockLight: {
            backgroundColor: "#e2e8f0",
        },
        previewBlockDark: {
            backgroundColor: "#475569",
        },
        previewBlockSmall: {
            height: 10,
            width: "60%",
            borderRadius: 6,
            backgroundColor: "#e2e8f0",
        },
        previewBlockSmallLight: {
            backgroundColor: "#e2e8f0",
        },
        previewBlockSmallDark: {
            backgroundColor: "#475569",
        },
        appearanceLabel: {
            fontSize: scaleFont(14, fontScale),
            fontWeight: "600",
            color: theme.textSecondary,
        },
        appearanceLabelActive: {
            color: theme.accent,
        },
        preferenceDivider: {
            height: 1,
            backgroundColor: theme.border,
            marginHorizontal: 16,
        },
        fontSizeList: {
            marginTop: 4,
        },
        fontSizeRow: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 16,
            paddingVertical: 14,
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
        },
        fontSizeRowLast: {
            borderBottomWidth: 0,
            paddingBottom: 18,
            marginBottom: 4,
        },
        fontSizeRowLabel: {
            fontSize: scaleFont(15, fontScale),
            color: theme.textPrimary,
        },
        fontSizeRowLabelActive: {
            color: theme.accent,
            fontWeight: "700",
        },
        fontSizeCheckmark: {
            color: theme.accent,
        },
    });
