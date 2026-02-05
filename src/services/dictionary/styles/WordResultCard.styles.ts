import { Dimensions, StyleSheet } from "react-native";

import type { AppThemeColors } from "@/theme/types";
import { scaleFont } from "@/theme/utils";

const WINDOW_HEIGHT = Dimensions.get("window").height;
const CARD_HEIGHT = Math.max(0, WINDOW_HEIGHT - 180);

export const createWordResultCardStyles = (theme: AppThemeColors, fontScale: number) =>
    StyleSheet.create({
        resultCard: {
            backgroundColor: theme.surface,
            borderRadius: 28,
            padding: 24,
            marginBottom: 24,
            shadowColor: theme.shadow,
            shadowOffset: { width: 0, height: 16 },
            shadowOpacity: 0.08,
            shadowRadius: 20,
            elevation: 8,
            maxHeight: CARD_HEIGHT,
        },
        resultHeader: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 16,
        },
        cardLabel: {
            fontSize: scaleFont(12, fontScale),
            fontWeight: "700",
            color: theme.textMuted,
            letterSpacing: 1.2,
            textTransform: "uppercase",
            marginBottom: 6,
        },
        resultActions: {
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
        },
        iconButton: {
            width: 40,
            height: 40,
            borderRadius: 14,
            backgroundColor: theme.cardMuted,
            alignItems: "center",
            justifyContent: "center",
        },
        wordText: {
            fontSize: scaleFont(32, fontScale),
            fontWeight: "800",
            color: theme.textPrimary,
        },
        phoneticText: {
            fontSize: scaleFont(16, fontScale),
            color: theme.textSecondary,
            marginTop: 4,
        },
        meaningScroll: {
            marginTop: 8,
        },
        meaningContent: {
            paddingBottom: 16,
        },
        meaningBlock: {
            marginBottom: 20,
            gap: 12,
        },
        meaningHeaderRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
        },
        partOfSpeech: {
            fontSize: scaleFont(14, fontScale),
            fontWeight: "700",
            color: theme.accent,
            textTransform: "capitalize",
        },
        meaningDivider: {
            height: 1,
            backgroundColor: theme.border,
            flex: 1,
        },
        definitionRow: {
            flexDirection: "row",
            gap: 12,
            marginBottom: 16,
            alignItems: "flex-start",
        },
        definitionIndex: {
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: theme.chipBackground,
            alignItems: "center",
            justifyContent: "center",
        },
        definitionIndexText: {
            fontWeight: "700",
            color: theme.accent,
        },
        definitionBody: {
            flex: 1,
            gap: 6,
        },
        definitionText: {
            fontSize: scaleFont(16, fontScale),
            fontWeight: "600",
            color: theme.textPrimary,
        },
        definitionHint: {
            fontSize: scaleFont(13, fontScale),
            color: theme.textSecondary,
        },
        exampleText: {
            fontSize: scaleFont(14, fontScale),
            color: theme.textSecondary,
            marginTop: 4,
        },
        exampleTranslationText: {
            fontSize: scaleFont(13, fontScale),
            color: theme.textMuted,
            marginTop: 2,
        },
        exampleSkeleton: {
            height: 14,
            backgroundColor: theme.border,
            borderRadius: 8,
            marginTop: 6,
            width: "70%",
        },
        noExampleText: {
            fontSize: scaleFont(14, fontScale),
            color: theme.textMuted,
            marginTop: 12,
        },
        exampleToggleButton: {
            marginTop: 12,
            backgroundColor: theme.textPrimary,
            paddingVertical: 12,
            borderRadius: 16,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: 8,
        },
        exampleToggleButtonDisabled: {
            backgroundColor: theme.border,
        },
        exampleToggleButtonText: {
            color: theme.accentContrast,
            fontWeight: "700",
        },
        exampleToggleButtonTextDisabled: {
            color: theme.textMuted,
        },
    });
