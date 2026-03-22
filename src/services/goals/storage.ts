import { getPreferenceValue, setPreferenceValue } from "@/services/database";
import {
    createDefaultDailyGoalSettings,
    createDefaultReviewStreakState,
    normalizeDailyGoalSettings,
    normalizeReviewStreakState,
} from "@/services/goals/dailyGoal";
import type { DailyGoalSettings, ReviewStreakState } from "@/services/goals/types";

export const DAILY_GOAL_SETTINGS_PREFERENCE_KEY = "review.daily_goal.settings";
export const REVIEW_STREAK_STATE_PREFERENCE_KEY = "review.streak.state";

function parseJsonPreference(value: string | null): unknown {
    if (!value) {
        return null;
    }

    try {
        return JSON.parse(value);
    } catch {
        return null;
    }
}

export async function loadDailyGoalSettings(): Promise<DailyGoalSettings> {
    const rawValue = await getPreferenceValue(DAILY_GOAL_SETTINGS_PREFERENCE_KEY);
    const parsed = parseJsonPreference(rawValue);
    return parsed ? normalizeDailyGoalSettings(parsed) : createDefaultDailyGoalSettings();
}

export async function saveDailyGoalSettings(settings: DailyGoalSettings): Promise<void> {
    await setPreferenceValue(DAILY_GOAL_SETTINGS_PREFERENCE_KEY, JSON.stringify(normalizeDailyGoalSettings(settings)));
}

export async function loadReviewStreakState(): Promise<ReviewStreakState> {
    const rawValue = await getPreferenceValue(REVIEW_STREAK_STATE_PREFERENCE_KEY);
    const parsed = parseJsonPreference(rawValue);
    return parsed ? normalizeReviewStreakState(parsed) : createDefaultReviewStreakState();
}

export async function saveReviewStreakState(state: ReviewStreakState): Promise<void> {
    await setPreferenceValue(REVIEW_STREAK_STATE_PREFERENCE_KEY, JSON.stringify(normalizeReviewStreakState(state)));
}
