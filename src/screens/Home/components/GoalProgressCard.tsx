import React from "react";
import { Text, View } from "react-native";

import { createGoalProgressCardStyles } from "@/screens/Home/styles/GoalProgressCard.styles";
import type { DailyGoalProgress, ReviewStreakState } from "@/services/goals";
import { useThemedStyles } from "@/theme/useThemedStyles";

type GoalProgressCardProps = {
    showGoal: boolean;
    progress: DailyGoalProgress;
    streak: ReviewStreakState;
    reminderLabel: string | null;
};

export function GoalProgressCard({ showGoal, progress, streak, reminderLabel }: GoalProgressCardProps) {
    const styles = useThemedStyles(createGoalProgressCardStyles);

    return (
        <View style={styles.card}>
            <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>오늘 목표</Text>
                <Text style={styles.metricValue}>
                    {showGoal ? `${progress.completedCount} / ${progress.targetCount}` : "목표 없음"}
                </Text>
                <Text style={styles.metricHelper}>
                    {showGoal
                        ? progress.isComplete
                            ? "오늘 목표를 달성했어요"
                            : `${progress.remainingCount}개 남았어요`
                        : "부담 없는 숫자로 시작해보세요"}
                </Text>
            </View>

            <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>연속 학습</Text>
                <Text style={styles.metricValue}>{streak.currentStreak}일</Text>
                <Text style={styles.metricHelper}>최장 {streak.longestStreak}일</Text>
            </View>

            <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>리마인더</Text>
                <Text style={styles.metricValue}>{reminderLabel ?? "꺼짐"}</Text>
                <Text style={styles.metricHelper}>
                    {reminderLabel ? "다음 알림이 예정돼 있어요" : "설정에서 시간을 정할 수 있어요"}
                </Text>
            </View>
        </View>
    );
}
