export {
    computeDailyGoalProgress,
    createDefaultDailyGoalSettings,
    createDefaultReviewStreakState,
    normalizeDailyGoalSettings,
    normalizeReviewStreakState,
    updateReviewStreak,
} from "@/services/goals/dailyGoal";
export {
    DAILY_GOAL_SETTINGS_PREFERENCE_KEY,
    loadDailyGoalSettings,
    loadReviewStreakState,
    REVIEW_STREAK_STATE_PREFERENCE_KEY,
    saveDailyGoalSettings,
    saveReviewStreakState,
} from "@/services/goals/storage";
export type { DailyGoalProgress, DailyGoalSettings, ReviewStreakState } from "@/services/goals/types";
