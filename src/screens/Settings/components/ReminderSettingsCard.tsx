import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

import { createStyles } from "@/screens/Settings/SettingsScreen.styles";
import type { ReviewReminderSettings } from "@/services/notifications";
import { useThemedStyles } from "@/theme/useThemedStyles";

const REMINDER_PRESETS = [
    { label: "오전 8:00", hour: 8, minute: 0 },
    { label: "오후 8:00", hour: 20, minute: 0 },
    { label: "오후 9:00", hour: 21, minute: 0 },
    { label: "오후 10:00", hour: 22, minute: 0 },
] as const;

const WEEKDAY_OPTIONS = [
    { label: "월", value: 1 },
    { label: "화", value: 2 },
    { label: "수", value: 3 },
    { label: "목", value: 4 },
    { label: "금", value: 5 },
    { label: "토", value: 6 },
    { label: "일", value: 0 },
] as const;

type ReminderSettingsCardProps = {
    settings: ReviewReminderSettings;
    nextReminderLabel: string | null;
    onToggleEnabled: (enabled: boolean) => void;
    onSelectTime: (hour: number, minute: number) => void;
    onToggleWeekday: (weekday: number) => void;
};

export function ReminderSettingsCard({
    settings,
    nextReminderLabel,
    onToggleEnabled,
    onSelectTime,
    onToggleWeekday,
}: ReminderSettingsCardProps) {
    const styles = useThemedStyles(createStyles);

    return (
        <View style={styles.managementCard}>
            <View style={styles.managementHeader}>
                <View style={styles.managementHeaderText}>
                    <Text style={styles.managementTitle}>리마인더 받기</Text>
                    <Text style={styles.managementDescription}>
                        {settings.enabled && nextReminderLabel
                            ? `다음 알림 ${nextReminderLabel}`
                            : "알림이 꺼져 있어요."}
                    </Text>
                </View>
                <TouchableOpacity
                    style={[styles.statusChip, settings.enabled && styles.statusChipActive]}
                    onPress={() => {
                        onToggleEnabled(!settings.enabled);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={settings.enabled ? "리마인더 끄기" : "리마인더 켜기"}
                >
                    <Text style={[styles.statusChipText, settings.enabled && styles.statusChipTextActive]}>
                        {settings.enabled ? "켜짐" : "꺼짐"}
                    </Text>
                </TouchableOpacity>
            </View>

            {settings.enabled ? (
                <>
                    <View style={styles.chipRow}>
                        {REMINDER_PRESETS.map((preset) => {
                            const isSelected = settings.hour === preset.hour && settings.minute === preset.minute;
                            return (
                                <TouchableOpacity
                                    key={preset.label}
                                    style={[styles.choiceChip, isSelected && styles.choiceChipActive]}
                                    onPress={() => {
                                        onSelectTime(preset.hour, preset.minute);
                                    }}
                                    accessibilityRole="button"
                                    accessibilityLabel={`${preset.label} 알림 시간 선택`}
                                >
                                    <Text style={[styles.choiceChipText, isSelected && styles.choiceChipTextActive]}>
                                        {preset.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    <View style={styles.chipRow}>
                        {WEEKDAY_OPTIONS.map((option) => {
                            const isSelected = settings.weekdays.includes(option.value);
                            return (
                                <TouchableOpacity
                                    key={option.label}
                                    style={[styles.choiceChip, isSelected && styles.choiceChipActive]}
                                    onPress={() => {
                                        onToggleWeekday(option.value);
                                    }}
                                    accessibilityRole="button"
                                    accessibilityLabel={`${option.label}요일 알림 토글`}
                                >
                                    <Text style={[styles.choiceChipText, isSelected && styles.choiceChipTextActive]}>
                                        {option.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </>
            ) : null}
        </View>
    );
}
