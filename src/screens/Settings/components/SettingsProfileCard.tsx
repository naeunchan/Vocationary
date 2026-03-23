import React from "react";
import { Text, View } from "react-native";

import { createStyles } from "@/screens/Settings/SettingsScreen.styles";
import { useThemedStyles } from "@/theme/useThemedStyles";

type SettingsProfileCardProps = {
    displayName: string;
    subtitle: string;
    initials: string;
};

export function SettingsProfileCard({ displayName, subtitle, initials }: SettingsProfileCardProps) {
    const styles = useThemedStyles(createStyles);

    return (
        <View style={styles.profileCard}>
            <View style={styles.profileAvatar}>
                <Text style={styles.profileAvatarInitial}>{initials}</Text>
            </View>
            <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{displayName}</Text>
                <Text style={styles.profileSubtitle}>{subtitle}</Text>
            </View>
        </View>
    );
}
