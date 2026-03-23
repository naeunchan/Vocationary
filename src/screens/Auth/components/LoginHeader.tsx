import React from "react";
import { Text, View } from "react-native";

import { createLoginScreenStyles } from "@/screens/Auth/LoginScreen.styles";
import { useThemedStyles } from "@/theme/useThemedStyles";

type LoginHeaderProps = {
    brand?: string;
    title?: string;
    subtitle?: string;
};

export function LoginHeader({ brand, title, subtitle }: LoginHeaderProps) {
    const styles = useThemedStyles(createLoginScreenStyles);
    return (
        <View style={styles.hero}>
            {brand ? <Text style={styles.brandText}>{brand}</Text> : null}
            {title ? <Text style={styles.title}>{title}</Text> : null}
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
    );
}
