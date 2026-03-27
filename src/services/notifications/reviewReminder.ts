import { getPreferenceValue, setPreferenceValue } from "@/services/database";

export type ReviewReminderSettings = {
    enabled: boolean;
    hour: number;
    minute: number;
    weekdays: number[];
    updatedAt: string | null;
};

export const REVIEW_REMINDER_SETTINGS_PREFERENCE_KEY = "review.reminder.settings";

function clampHour(value: number): number {
    if (!Number.isFinite(value)) {
        return 20;
    }

    return Math.min(23, Math.max(0, Math.round(value)));
}

function clampMinute(value: number): number {
    if (!Number.isFinite(value)) {
        return 0;
    }

    return Math.min(59, Math.max(0, Math.round(value)));
}

function normalizeWeekdays(value: unknown): number[] {
    if (!Array.isArray(value)) {
        return [1, 2, 3, 4, 5, 6, 0];
    }

    const normalized = Array.from(
        new Set(
            value.map((entry) => Number(entry)).filter((entry) => Number.isInteger(entry) && entry >= 0 && entry <= 6),
        ),
    );

    return normalized.length > 0 ? normalized : [1, 2, 3, 4, 5, 6, 0];
}

export function createDefaultReviewReminderSettings(): ReviewReminderSettings {
    return {
        enabled: false,
        hour: 20,
        minute: 0,
        weekdays: [1, 2, 3, 4, 5, 6, 0],
        updatedAt: null,
    };
}

export function normalizeReviewReminderSettings(value: unknown): ReviewReminderSettings {
    if (!value || typeof value !== "object") {
        return createDefaultReviewReminderSettings();
    }

    const candidate = value as Partial<ReviewReminderSettings>;
    return {
        enabled: Boolean(candidate.enabled),
        hour: clampHour(typeof candidate.hour === "number" ? candidate.hour : Number.NaN),
        minute: clampMinute(typeof candidate.minute === "number" ? candidate.minute : Number.NaN),
        weekdays: normalizeWeekdays(candidate.weekdays),
        updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : null,
    };
}

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

export async function loadReviewReminderSettings(): Promise<ReviewReminderSettings> {
    const rawValue = await getPreferenceValue(REVIEW_REMINDER_SETTINGS_PREFERENCE_KEY);
    const parsed = parseJsonPreference(rawValue);
    return parsed ? normalizeReviewReminderSettings(parsed) : createDefaultReviewReminderSettings();
}

export async function saveReviewReminderSettings(settings: ReviewReminderSettings): Promise<void> {
    await setPreferenceValue(
        REVIEW_REMINDER_SETTINGS_PREFERENCE_KEY,
        JSON.stringify(normalizeReviewReminderSettings(settings)),
    );
}

export function getNextReviewReminderAt(settings: ReviewReminderSettings, options?: { from?: Date }): Date | null {
    if (!settings.enabled) {
        return null;
    }

    const from = options?.from ?? new Date();
    const nextCandidate = new Date(from);

    for (let offset = 0; offset <= 7; offset += 1) {
        nextCandidate.setFullYear(from.getFullYear(), from.getMonth(), from.getDate() + offset);
        nextCandidate.setHours(settings.hour, settings.minute, 0, 0);

        const isAllowedWeekday = settings.weekdays.includes(nextCandidate.getDay());
        if (!isAllowedWeekday) {
            continue;
        }

        if (nextCandidate.getTime() > from.getTime()) {
            return new Date(nextCandidate);
        }
    }

    return null;
}
