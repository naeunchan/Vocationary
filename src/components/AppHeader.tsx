import { Ionicons } from "@expo/vector-icons";
import { type NavigationProp, type ParamListBase, useNavigation } from "@react-navigation/native";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { createAppHeaderStyles } from "@/components/AppHeader.styles";
import { useAppAppearance } from "@/theme/AppearanceContext";
import { useThemedStyles } from "@/theme/useThemedStyles";

type AppHeaderProps = {
    title?: string;
    stepLabel?: string;
    onBack?: () => void;
    showBack?: boolean;
};

export function AppHeader({ title, stepLabel, onBack, showBack = true }: AppHeaderProps) {
    const { theme } = useAppAppearance();
    const styles = useThemedStyles(createAppHeaderStyles);
    const navigation = useNavigation<NavigationProp<ParamListBase>>();
    const handleBack = onBack ?? navigation.goBack;

    return (
        <SafeAreaView edges={["top"]} style={styles.safeArea}>
            <View style={styles.container}>
                {showBack ? (
                    <TouchableOpacity
                        onPress={handleBack}
                        accessibilityRole="button"
                        accessibilityLabel="뒤로가기"
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        style={styles.backButton}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="chevron-back" size={24} color={theme.textPrimary} />
                    </TouchableOpacity>
                ) : (
                    <View style={styles.backPlaceholder} />
                )}
                <Text style={styles.title} numberOfLines={1}>
                    {title}
                </Text>
                {stepLabel ? (
                    <View style={styles.stepPill}>
                        <Text style={styles.stepText}>{stepLabel}</Text>
                    </View>
                ) : (
                    <View style={styles.stepPlaceholder} />
                )}
            </View>
        </SafeAreaView>
    );
}
