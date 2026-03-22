import type { DailyGoalProgress, DailyGoalSettings, ReviewStreakState } from "@/services/goals/types";

const DEFAULT_DAILY_GOAL_TARGET = 10;

function clampGoalTarget(value: number): number {
    if (!Number.isFinite(value)) {
        return DEFAULT_DAILY_GOAL_TARGET;
    }

    return Math.min(200, Math.max(1, Math.round(value)));
}

function normalizeCount(value: number): number {
    if (!Number.isFinite(value)) {
        return 0;
    }

    return Math.max(0, Math.round(value));
}

function toCalendarDateKey(value: Date): string {
    const year = value.getFullYear();
    const month = `${value.getMonth() + 1}`.padStart(2, "0");
    const day = `${value.getDate()}`.padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function parseDateKey(value: string | null): Date | null {
    if (!value) {
        return null;
    }

    const parsed = new Date(`${value}T00:00:00`);
    return Number.isFinite(parsed.getTime()) ? parsed : null;
}

function diffCalendarDays(previous: string | null, next: string): number | null {
    const previousDate = parseDateKey(previous);
    const nextDate = parseDateKey(next);
    if (!previousDate || !nextDate) {
        return null;
    }

    const diffMs = nextDate.getTime() - previousDate.getTime();
    return Math.round(diffMs / (24 * 60 * 60 * 1000));
}

export function createDefaultDailyGoalSettings(): DailyGoalSettings {
    return {
        enabled: false,
        targetCount: DEFAULT_DAILY_GOAL_TARGET,
        updatedAt: null,
    };
}

export function createDefaultReviewStreakState(): ReviewStreakState {
    return {
        currentStreak: 0,
        longestStreak: 0,
        lastCompletedDate: null,
    };
}

export function normalizeDailyGoalSettings(value: unknown): DailyGoalSettings {
    if (!value || typeof value !== "object") {
        return createDefaultDailyGoalSettings();
    }

    const candidate = value as Partial<DailyGoalSettings>;
    return {
        enabled: Boolean(candidate.enabled),
        targetCount: clampGoalTarget(typeof candidate.targetCount === "number" ? candidate.targetCount : Number.NaN),
        updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : null,
    };
}

export function normalizeReviewStreakState(value: unknown): ReviewStreakState {
    if (!value || typeof value !== "object") {
        return createDefaultReviewStreakState();
    }

    const candidate = value as Partial<ReviewStreakState>;
    return {
        currentStreak: normalizeCount(typeof candidate.currentStreak === "number" ? candidate.currentStreak : 0),
        longestStreak: normalizeCount(typeof candidate.longestStreak === "number" ? candidate.longestStreak : 0),
        lastCompletedDate: typeof candidate.lastCompletedDate === "string" ? candidate.lastCompletedDate : null,
    };
}

export function computeDailyGoalProgress(completedCount: number, settings: DailyGoalSettings): DailyGoalProgress {
    const normalizedCompleted = normalizeCount(completedCount);
    const targetCount = clampGoalTarget(settings.targetCount);
    const remainingCount = Math.max(0, targetCount - normalizedCompleted);

    return {
        completedCount: normalizedCompleted,
        targetCount,
        remainingCount,
        isComplete: settings.enabled ? remainingCount === 0 : false,
    };
}

export function updateReviewStreak(
    state: ReviewStreakState,
    options: { completedCount: number; completedAt?: Date },
): ReviewStreakState {
    const completedCount = normalizeCount(options.completedCount);
    if (completedCount <= 0) {
        return state;
    }

    const completedAt = options.completedAt ?? new Date();
    const completedDate = toCalendarDateKey(completedAt);
    const dayDiff = diffCalendarDays(state.lastCompletedDate, completedDate);

    if (dayDiff === 0) {
        return state;
    }

    const nextCurrentStreak = dayDiff === 1 ? state.currentStreak + 1 : 1;

    return {
        currentStreak: nextCurrentStreak,
        longestStreak: Math.max(state.longestStreak, nextCurrentStreak),
        lastCompletedDate: completedDate,
    };
}
