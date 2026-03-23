import React from "react";
import { Text, View } from "react-native";

import { createStyles } from "@/screens/Settings/SettingsScreen.styles";
import { useThemedStyles } from "@/theme/useThemedStyles";

type SettingsSectionProps = {
    label: string;
    children: React.ReactNode;
    useCard?: boolean;
};

export function SettingsSection({ label, children, useCard = true }: SettingsSectionProps) {
    const styles = useThemedStyles(createStyles);

    return (
        <View style={styles.section}>
            <Text style={styles.sectionLabel}>{label}</Text>
            {useCard ? <View style={styles.sectionCard}>{children}</View> : children}
        </View>
    );
}
