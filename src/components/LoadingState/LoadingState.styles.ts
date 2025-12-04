import { StyleSheet } from "react-native";

import type { AppThemeColors } from "@/theme/types";
import { scaleFont } from "@/theme/utils";

export const createLoadingStateStyles = (theme: AppThemeColors, fontScale: number) =>
    StyleSheet.create({
        container: {
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
        },
        message: {
            fontSize: scaleFont(15, fontScale),
            color: theme.textSecondary,
        },
    });
