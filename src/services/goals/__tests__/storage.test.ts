import {
    createDefaultDailyGoalSettings,
    createDefaultReviewStreakState,
    loadDailyGoalSettings,
    loadReviewStreakState,
    saveDailyGoalSettings,
    saveReviewStreakState,
} from "@/services/goals";

const mockGetPreferenceValue = jest.fn();
const mockSetPreferenceValue = jest.fn();

jest.mock("@/services/database", () => ({
    getPreferenceValue: (...args: unknown[]) => mockGetPreferenceValue(...args),
    setPreferenceValue: (...args: unknown[]) => mockSetPreferenceValue(...args),
}));

describe("goal storage", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("loads defaults when preferences are missing or invalid", async () => {
        mockGetPreferenceValue.mockResolvedValueOnce(null).mockResolvedValueOnce("{invalid");

        await expect(loadDailyGoalSettings()).resolves.toEqual(createDefaultDailyGoalSettings());
        await expect(loadReviewStreakState()).resolves.toEqual(createDefaultReviewStreakState());
    });

    it("serializes normalized settings and streak state", async () => {
        await saveDailyGoalSettings({ enabled: true, targetCount: 0, updatedAt: "2026-03-23T00:00:00.000Z" });
        await saveReviewStreakState({ currentStreak: 2, longestStreak: 4, lastCompletedDate: "2026-03-22" });

        expect(mockSetPreferenceValue).toHaveBeenNthCalledWith(
            1,
            "review.daily_goal.settings",
            JSON.stringify({
                enabled: true,
                targetCount: 1,
                updatedAt: "2026-03-23T00:00:00.000Z",
            }),
        );
        expect(mockSetPreferenceValue).toHaveBeenNthCalledWith(
            2,
            "review.streak.state",
            JSON.stringify({
                currentStreak: 2,
                longestStreak: 4,
                lastCompletedDate: "2026-03-22",
            }),
        );
    });
});
