import { StyleSheet } from "react-native";

import type { AppThemeColors } from "@/theme/types";
import { scaleFont } from "@/theme/utils";

export const createFavoritesFlashcardStyles = (theme: AppThemeColors, fontScale: number) =>
    StyleSheet.create({
        container: {
            width: "100%",
        },
        card: {
            backgroundColor: theme.surface,
            borderRadius: 28,
            padding: 24,
            gap: 20,
            shadowColor: theme.shadow,
            shadowOffset: { width: 0, height: 16 },
            shadowOpacity: 0.08,
            shadowRadius: 20,
            elevation: 6,
        },
        headerSection: {
            alignItems: "center",
            gap: 10,
        },
        word: {
            fontSize: scaleFont(32, fontScale),
            fontWeight: "800",
            color: theme.textPrimary,
            textAlign: "center",
        },
        phonetic: {
            fontSize: scaleFont(18, fontScale),
            color: theme.textSecondary,
            textAlign: "center",
        },
        meaningContainer: {
            padding: 18,
            backgroundColor: theme.cardMuted,
            borderRadius: 20,
            minHeight: 150,
        },
        meaningScroll: {
            maxHeight: 220,
        },
        meaningContent: {
            paddingBottom: 4,
        },
        meaningText: {
            fontSize: scaleFont(16, fontScale),
            color: theme.textPrimary,
            lineHeight: scaleFont(22, fontScale),
            textAlign: "center",
        },
        actions: {
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "center",
            columnGap: 16,
            rowGap: 12,
        },
        actionButton: {
            width: 56,
            height: 56,
            borderRadius: 18,
            backgroundColor: theme.chipBackground,
            alignItems: "center",
            justifyContent: "center",
            shadowColor: theme.shadow,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.08,
            shadowRadius: 12,
            elevation: 4,
        },
    });
