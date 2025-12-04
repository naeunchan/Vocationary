import { StyleSheet } from "react-native";

import type { AppThemeColors } from "@/theme/types";
import { scaleFont } from "@/theme/utils";

export const createFavoritesListStyles = (theme: AppThemeColors, fontScale: number) =>
    StyleSheet.create({
        container: {
            backgroundColor: theme.surface,
            borderRadius: 26,
            padding: 20,
            shadowColor: theme.shadow,
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.08,
            shadowRadius: 16,
            elevation: 6,
            gap: 12,
        },
        header: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-start",
        },
        sectionLabel: {
            fontSize: scaleFont(13, fontScale),
            color: theme.textMuted,
            fontWeight: "700",
            textTransform: "uppercase",
            letterSpacing: 0.8,
            marginBottom: 6,
        },
        subtitle: {
            fontSize: scaleFont(14, fontScale),
            color: theme.textSecondary,
            marginTop: 4,
        },
        count: {
            fontSize: scaleFont(24, fontScale),
            fontWeight: "800",
            color: theme.accent,
        },
        list: {
            marginTop: 8,
        },
        listContent: {
            paddingBottom: 4,
        },
        itemRow: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingVertical: 12,
        },
        itemText: {
            flex: 1,
            paddingRight: 12,
        },
        word: {
            fontSize: scaleFont(16, fontScale),
            fontWeight: "700",
            color: theme.textPrimary,
            marginBottom: 4,
        },
        phonetic: {
            fontSize: scaleFont(13, fontScale),
            color: theme.textSecondary,
            marginBottom: 4,
        },
        definition: {
            fontSize: scaleFont(14, fontScale),
            color: theme.textSecondary,
        },
        actions: {
            flexDirection: "row",
            alignItems: "center",
            columnGap: 8,
        },
        actionButton: {
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: theme.chipBackground,
            alignItems: "center",
            justifyContent: "center",
        },
        separator: {
            height: 1,
            backgroundColor: theme.border,
        },
        emptyText: {
            fontSize: scaleFont(15, fontScale),
            color: theme.textMuted,
            textAlign: "center",
            paddingVertical: 24,
        },
    });
