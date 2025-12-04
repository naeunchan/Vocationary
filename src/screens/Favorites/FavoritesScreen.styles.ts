import { StyleSheet } from "react-native";

import type { AppThemeColors } from "@/theme/types";
import { scaleFont } from "@/theme/utils";

export const createFavoritesScreenStyles = (theme: AppThemeColors, fontScale: number) =>
    StyleSheet.create({
        safeArea: {
            flex: 1,
            backgroundColor: theme.background,
        },
        scrollContent: {
            paddingHorizontal: 20,
            paddingTop: 24,
            paddingBottom: 40,
            gap: 20,
        },
        heroCard: {
            backgroundColor: theme.accent,
            borderRadius: 28,
            padding: 24,
            gap: 8,
            shadowColor: theme.shadow,
            shadowOffset: { width: 0, height: 16 },
            shadowOpacity: 0.18,
            shadowRadius: 24,
            elevation: 8,
        },
        heroTitle: {
            fontSize: scaleFont(26, fontScale),
            fontWeight: "800",
            color: theme.accentContrast,
        },
        heroSubtitle: {
            fontSize: scaleFont(15, fontScale),
            color: theme.isDark ? theme.textSecondary : "#dbeafe",
        },
        segmentCard: {
            backgroundColor: theme.surface,
            borderRadius: 24,
            padding: 20,
            shadowColor: theme.shadow,
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.08,
            shadowRadius: 16,
            elevation: 6,
            gap: 12,
        },
        segmentLabel: {
            fontSize: scaleFont(14, fontScale),
            fontWeight: "700",
            color: theme.textSecondary,
        },
        segmentedControl: {
            flexDirection: "row",
            backgroundColor: theme.cardMuted,
            padding: 4,
            borderRadius: 999,
            gap: 6,
        },
        segmentButton: {
            flex: 1,
            borderRadius: 999,
            paddingVertical: 10,
            alignItems: "center",
        },
        segmentButtonActive: {
            backgroundColor: theme.accent,
        },
        segmentButtonText: {
            fontSize: scaleFont(14, fontScale),
            fontWeight: "700",
            color: theme.textSecondary,
        },
        segmentButtonTextActive: {
            color: theme.accentContrast,
        },
        emptyCard: {
            backgroundColor: theme.surface,
            borderRadius: 24,
            padding: 24,
            alignItems: "flex-start",
            gap: 8,
            shadowColor: theme.shadow,
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.08,
            shadowRadius: 16,
            elevation: 6,
        },
        emptyTitle: {
            fontSize: scaleFont(18, fontScale),
            fontWeight: "700",
            color: theme.textPrimary,
        },
        emptySubtitle: {
            fontSize: scaleFont(14, fontScale),
            color: theme.textSecondary,
        },
    });
