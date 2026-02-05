import React from "react";
import { Text, View } from "react-native";

import { SUMMARY_CARD_TEXT, SUMMARY_STAT_CONFIG } from "@/screens/Home/constants";
import { createSummaryCardStyles } from "@/screens/Home/styles/SummaryCard.styles";
import { SummaryCardProps } from "@/screens/Home/types/SummaryCard.types";
import { useThemedStyles } from "@/theme/useThemedStyles";

export function SummaryCard({ userName, counts }: SummaryCardProps) {
    const styles = useThemedStyles(createSummaryCardStyles);
    const total = (counts?.toMemorize ?? 0) + (counts?.review ?? 0) + (counts?.mastered ?? 0);
    const statValues = {
        total,
        toMemorize: counts?.toMemorize ?? 0,
        review: counts?.review ?? 0,
        mastered: counts?.mastered ?? 0,
    } as const;
    const greetingText = userName?.trim() ? `${userName}님의 진행상황` : SUMMARY_CARD_TEXT.defaultGreeting;

    return (
        <View style={styles.card}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.sectionLabel}>{SUMMARY_CARD_TEXT.sectionLabel}</Text>
                    <Text style={styles.greeting}>{greetingText}</Text>
                </View>
            </View>

            <View style={styles.grid}>
                {SUMMARY_STAT_CONFIG.map((stat) => (
                    <View key={stat.key} style={styles.statCard}>
                        <Text style={styles.statLabel}>{stat.label}</Text>
                        <Text style={styles.statValue}>{statValues[stat.key]}</Text>
                    </View>
                ))}
            </View>
        </View>
    );
}
