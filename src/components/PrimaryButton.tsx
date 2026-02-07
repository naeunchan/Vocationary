import React from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { createPrimaryButtonStyles } from "@/components/PrimaryButton.styles";
import { useAppAppearance } from "@/theme/AppearanceContext";
import { useThemedStyles } from "@/theme/useThemedStyles";

type PrimaryButtonProps = {
    label: string;
    onPress: () => void;
    disabled?: boolean;
    loading?: boolean;
};

export function PrimaryButton({ label, onPress, disabled = false, loading = false }: PrimaryButtonProps) {
    const { theme } = useAppAppearance();
    const styles = useThemedStyles(createPrimaryButtonStyles);
    const isDisabled = disabled || loading;

    return (
        <SafeAreaView edges={["bottom"]} style={styles.safeArea}>
            <View style={styles.container}>
                <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={label}
                    accessibilityState={{ disabled: isDisabled }}
                    activeOpacity={0.9}
                    onPress={onPress}
                    disabled={isDisabled}
                    style={[styles.button, isDisabled && styles.buttonDisabled]}
                >
                    {loading ? (
                        <View style={styles.loadingRow}>
                            <ActivityIndicator size="small" color={theme.accentContrast} />
                            <Text style={styles.loadingText}>처리 중...</Text>
                        </View>
                    ) : (
                        <Text style={styles.buttonText}>{label}</Text>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}
