import {
    createDefaultReviewReminderSettings,
    getNextReviewReminderAt,
    normalizeReviewReminderSettings,
} from "@/services/notifications";

describe("review reminder", () => {
    it("normalizes invalid settings to safe defaults", () => {
        expect(
            normalizeReviewReminderSettings({ enabled: true, hour: 27, minute: -4, weekdays: [1, 8, 2, 2] }),
        ).toEqual({
            enabled: true,
            hour: 23,
            minute: 0,
            weekdays: [1, 2],
            updatedAt: null,
        });
    });

    it("returns null when reminders are disabled", () => {
        expect(getNextReviewReminderAt(createDefaultReviewReminderSettings())).toBeNull();
    });

    it("calculates the next matching reminder time", () => {
        const next = getNextReviewReminderAt(
            {
                enabled: true,
                hour: 20,
                minute: 15,
                weekdays: [1, 3, 5],
                updatedAt: "2026-03-23T00:00:00.000Z",
            },
            { from: new Date("2026-03-23T21:00:00") },
        );

        expect(next?.toISOString()).toBe("2026-03-25T11:15:00.000Z");
    });
});
