import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

import { createStyles } from "@/screens/Settings/SettingsScreen.styles";
import type { DailyGoalProgress, DailyGoalSettings, ReviewStreakState } from "@/services/goals";
import { useThemedStyles } from "@/theme/useThemedStyles";

const GOAL_PRESETS = [5, 10, 20, 30] as const;

type GoalSettingsCardProps = {
    settings: DailyGoalSettings;
    progress: DailyGoalProgress;
    streak: ReviewStreakState;
    onToggleEnabled: (enabled: boolean) => void;
    onSelectTarget: (targetCount: number) => void;
};

export function GoalSettingsCard({
    settings,
    progress,
    streak,
    onToggleEnabled,
    onSelectTarget,
}: GoalSettingsCardProps) {
    const styles = useThemedStyles(createStyles);

    return (
        <View style={styles.managementCard}>
            <View style={styles.managementHeader}>
                <View style={styles.managementHeaderText}>
                    <Text style={styles.managementTitle}>오늘 목표</Text>
                    <Text style={styles.managementDescription}>
                        {settings.enabled
                            ? `${progress.completedCount} / ${progress.targetCount} 완료`
                            : "아직 오늘 목표가 없어요. 부담 없는 숫자로 시작해보세요."}
                    </Text>
                </View>
                <TouchableOpacity
                    style={[styles.statusChip, settings.enabled && styles.statusChipActive]}
                    onPress={() => {
                        onToggleEnabled(!settings.enabled);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={settings.enabled ? "오늘 목표 끄기" : "오늘 목표 켜기"}
                >
                    <Text style={[styles.statusChipText, settings.enabled && styles.statusChipTextActive]}>
                        {settings.enabled ? "켜짐" : "꺼짐"}
                    </Text>
                </TouchableOpacity>
            </View>

            <View style={styles.chipRow}>
                {GOAL_PRESETS.map((preset) => {
                    const isSelected = settings.targetCount === preset;
                    return (
                        <TouchableOpacity
                            key={preset}
                            style={[styles.choiceChip, isSelected && styles.choiceChipActive]}
                            onPress={() => {
                                onSelectTarget(preset);
                            }}
                            accessibilityRole="button"
                            accessibilityLabel={`${preset}개 목표 선택`}
                        >
                            <Text style={[styles.choiceChipText, isSelected && styles.choiceChipTextActive]}>
                                {preset}개
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>남은 목표</Text>
                <Text style={styles.infoValue}>{settings.enabled ? `${progress.remainingCount}개` : "목표 없음"}</Text>
            </View>
            <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>연속 학습</Text>
                <Text style={styles.infoValue}>{streak.currentStreak}일</Text>
            </View>
        </View>
    );
}
