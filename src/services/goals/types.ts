export type DailyGoalSettings = {
    enabled: boolean;
    targetCount: number;
    updatedAt: string | null;
};

export type DailyGoalProgress = {
    completedCount: number;
    targetCount: number;
    remainingCount: number;
    isComplete: boolean;
};

export type ReviewStreakState = {
    currentStreak: number;
    longestStreak: number;
    lastCompletedDate: string | null;
};
