import React from "react";
import { Text, TouchableOpacity } from "react-native";

import { createLoginScreenStyles } from "@/screens/Auth/LoginScreen.styles";
import { t } from "@/shared/i18n";
import { useThemedStyles } from "@/theme/useThemedStyles";

type GuestButtonProps = {
    loading: boolean;
    onPress: () => void;
};

export function GuestButton({ loading, onPress }: GuestButtonProps) {
    const styles = useThemedStyles(createLoginScreenStyles);
    const label = t("auth.guest.cta");

    return (
        <TouchableOpacity
            style={[styles.guestButton, loading && styles.disabledButton]}
            onPress={onPress}
            disabled={loading}
            activeOpacity={0.9}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ disabled: loading }}
        >
            <Text style={styles.guestButtonText}>{label}</Text>
        </TouchableOpacity>
    );
}
