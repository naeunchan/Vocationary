import React from "react";
import { Text, TouchableOpacity } from "react-native";

import { createStyles } from "@/screens/Settings/SettingsScreen.styles";
import { useThemedStyles } from "@/theme/useThemedStyles";

type SettingsRowProps = {
    label: string;
    onPress?: () => void;
    value?: string;
    isLast?: boolean;
    disabled?: boolean;
    tone?: "default" | "danger";
};

export function SettingsRow({
    label,
    onPress,
    value,
    isLast = false,
    disabled = false,
    tone = "default",
}: SettingsRowProps) {
    const styles = useThemedStyles(createStyles);
    const isPressable = Boolean(onPress) && !disabled;
    const textToneStyle = tone === "danger" ? styles.rowDangerText : undefined;

    return (
        <TouchableOpacity
            activeOpacity={isPressable ? 0.6 : 1}
            disabled={!isPressable}
            onPress={onPress}
            style={[styles.row, !isLast && styles.rowBorder, (disabled || (!onPress && !value)) && styles.rowDisabled]}
        >
            <Text style={[styles.rowLabel, textToneStyle]}>{label}</Text>
            {value ? (
                <Text style={styles.rowValue}>{value}</Text>
            ) : (
                <Text style={[styles.rowChevron, textToneStyle]}>›</Text>
            )}
        </TouchableOpacity>
    );
}
