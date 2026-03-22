import {
    computeDailyGoalProgress,
    createDefaultDailyGoalSettings,
    createDefaultReviewStreakState,
    normalizeDailyGoalSettings,
    normalizeReviewStreakState,
    updateReviewStreak,
} from "@/services/goals/dailyGoal";

describe("daily goal services", () => {
    it("normalizes settings and streak state safely", () => {
        expect(
            normalizeDailyGoalSettings({ enabled: true, targetCount: 0, updatedAt: "2026-03-23T00:00:00.000Z" }),
        ).toMatchObject({
            enabled: true,
            targetCount: 1,
            updatedAt: "2026-03-23T00:00:00.000Z",
        });

        expect(
            normalizeReviewStreakState({ currentStreak: -5, longestStreak: 3, lastCompletedDate: "2026-03-22" }),
        ).toMatchObject({
            currentStreak: 0,
            longestStreak: 3,
            lastCompletedDate: "2026-03-22",
        });
    });

    it("computes progress against the configured target", () => {
        const settings = {
            ...createDefaultDailyGoalSettings(),
            enabled: true,
            targetCount: 12,
        };

        expect(computeDailyGoalProgress(5, settings)).toEqual({
            completedCount: 5,
            targetCount: 12,
            remainingCount: 7,
            isComplete: false,
        });

        expect(computeDailyGoalProgress(12, settings)).toEqual({
            completedCount: 12,
            targetCount: 12,
            remainingCount: 0,
            isComplete: true,
        });
    });

    it("updates streaks only once per calendar day and resets after gaps", () => {
        const initialState = createDefaultReviewStreakState();
        const first = updateReviewStreak(initialState, {
            completedCount: 4,
            completedAt: new Date("2026-03-22T10:00:00"),
        });
        const second = updateReviewStreak(first, {
            completedCount: 2,
            completedAt: new Date("2026-03-23T09:00:00"),
        });
        const sameDay = updateReviewStreak(second, {
            completedCount: 1,
            completedAt: new Date("2026-03-23T20:00:00"),
        });
        const reset = updateReviewStreak(second, {
            completedCount: 3,
            completedAt: new Date("2026-03-26T08:00:00"),
        });

        expect(first).toEqual({
            currentStreak: 1,
            longestStreak: 1,
            lastCompletedDate: "2026-03-22",
        });
        expect(second).toEqual({
            currentStreak: 2,
            longestStreak: 2,
            lastCompletedDate: "2026-03-23",
        });
        expect(sameDay).toEqual(second);
        expect(reset).toEqual({
            currentStreak: 1,
            longestStreak: 2,
            lastCompletedDate: "2026-03-26",
        });
    });
});
