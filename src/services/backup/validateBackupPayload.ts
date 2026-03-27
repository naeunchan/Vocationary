import { type FavoriteWordEntry, isMemorizationStatus } from "@/services/favorites/types";
import type { ReviewOutcome, ReviewProgressEntry, ReviewProgressMap } from "@/services/review/types";
import type { SearchHistoryEntry } from "@/services/searchHistory/types";

import { createRestoreError, type RestoreErr } from "./restoreResult";

type BackupUserPayload = {
    username: string;
    display_name: string | null;
    phone_number: string | null;
    password_hash: string | null;
    oauth_provider: string | null;
    oauth_sub: string | null;
};

export type ValidatedBackupPayload = {
    version: 1 | 2;
    exportedAt: string;
    users: BackupUserPayload[];
    favorites: Record<string, FavoriteWordEntry[]>;
    reviewProgress: Record<string, ReviewProgressMap>;
    searchHistory: SearchHistoryEntry[];
};

type ValidationOk = {
    ok: true;
    parsed: ValidatedBackupPayload;
};

type ValidationError = RestoreErr & { ok: false };

export type ValidateBackupPayloadResult = ValidationOk | ValidationError;

const LATEST_BACKUP_VERSION = 2;
const SUPPORTED_BACKUP_VERSIONS = new Set([1, 2]);
const MAX_BACKUP_USERS = 5_000;
const MAX_BACKUP_FAVORITES = 50_000;
const MAX_BACKUP_REVIEW_PROGRESS = 50_000;
const MAX_BACKUP_SEARCH_HISTORY = 1_000;

function invalidPayload(message: string, details?: Record<string, unknown>) {
    return createRestoreError("INVALID_PAYLOAD", message, details) as ValidationError;
}

function isValidationError(value: unknown): value is ValidationError {
    if (!value || typeof value !== "object") {
        return false;
    }
    const candidate = value as { ok?: unknown };
    return candidate.ok === false;
}

function normalizeNullableString(value: unknown) {
    if (value == null) {
        return null;
    }
    if (typeof value !== "string") {
        return null;
    }
    return value;
}

function normalizeReviewOutcome(value: unknown): ReviewOutcome | null {
    return value === "again" || value === "good" || value === "easy" ? value : null;
}

function normalizeReviewMetric(value: unknown): number {
    if (typeof value !== "number" || !Number.isFinite(value)) {
        return 0;
    }

    return Math.max(0, Math.round(value));
}

function normalizeReviewWordKey(value: unknown): string {
    return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function validateUsers(users: unknown): { users: BackupUserPayload[]; userSet: Set<string> } | ValidationError {
    if (!Array.isArray(users)) {
        return invalidPayload("백업 파일의 users 항목이 올바르지 않아요.");
    }
    if (users.length > MAX_BACKUP_USERS) {
        return invalidPayload("백업 파일의 사용자 수가 너무 많아요.", {
            users: users.length,
            max: MAX_BACKUP_USERS,
        });
    }

    const normalizedUsers: BackupUserPayload[] = [];
    const userSet = new Set<string>();

    for (let index = 0; index < users.length; index += 1) {
        const candidate = users[index];
        if (typeof candidate !== "object" || candidate === null) {
            return invalidPayload("백업 파일의 사용자 데이터 형식이 올바르지 않아요.", { index });
        }

        const row = candidate as Partial<BackupUserPayload>;
        const normalizedUsername = typeof row.username === "string" ? row.username.trim().toLowerCase() : "";
        if (!normalizedUsername) {
            return invalidPayload("백업 파일의 사용자 이메일이 비어 있어요.", { index });
        }
        if (userSet.has(normalizedUsername)) {
            return invalidPayload("백업 파일에 중복된 사용자 이메일이 있어요.", {
                index,
                username: normalizedUsername,
            });
        }

        userSet.add(normalizedUsername);
        normalizedUsers.push({
            username: normalizedUsername,
            display_name: normalizeNullableString(row.display_name),
            phone_number: normalizeNullableString(row.phone_number),
            password_hash: normalizeNullableString(row.password_hash),
            oauth_provider: normalizeNullableString(row.oauth_provider),
            oauth_sub: normalizeNullableString(row.oauth_sub),
        });
    }

    return {
        users: normalizedUsers,
        userSet,
    };
}

function validateFavoriteEntry(entry: unknown, userKey: string, index: number): FavoriteWordEntry | ValidationError {
    if (typeof entry !== "object" || entry === null) {
        return invalidPayload("백업 파일의 즐겨찾기 데이터 형식이 올바르지 않아요.", {
            user: userKey,
            index,
        });
    }

    const record = entry as Partial<FavoriteWordEntry>;
    if (typeof record.word !== "object" || record.word === null || typeof record.word.word !== "string") {
        return invalidPayload("백업 파일의 즐겨찾기 단어 정보가 올바르지 않아요.", {
            user: userKey,
            index,
        });
    }
    if (!isMemorizationStatus(record.status)) {
        return invalidPayload("백업 파일의 즐겨찾기 상태값이 올바르지 않아요.", {
            user: userKey,
            index,
        });
    }

    return {
        word: record.word,
        status: record.status,
        updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : new Date().toISOString(),
    };
}

function validateFavorites(
    favorites: unknown,
    userSet: Set<string>,
): { favorites: Record<string, FavoriteWordEntry[]>; totalFavorites: number } | ValidationError {
    if (typeof favorites !== "object" || favorites === null || Array.isArray(favorites)) {
        return invalidPayload("백업 파일의 favorites 항목이 올바르지 않아요.");
    }

    const normalizedFavorites: Record<string, FavoriteWordEntry[]> = {};
    let totalFavorites = 0;

    for (const [rawKey, entries] of Object.entries(favorites as Record<string, unknown>)) {
        const normalizedKey = rawKey.trim().toLowerCase();
        if (!normalizedKey) {
            return invalidPayload("백업 파일의 favorites 사용자 키가 비어 있어요.");
        }
        if (!userSet.has(normalizedKey)) {
            return invalidPayload("백업 파일의 favorites가 존재하지 않는 사용자와 연결되어 있어요.", {
                username: normalizedKey,
            });
        }
        if (!Array.isArray(entries)) {
            return invalidPayload("백업 파일의 favorites 항목이 배열이 아니에요.", {
                username: normalizedKey,
            });
        }

        const normalizedEntries: FavoriteWordEntry[] = [];
        for (let index = 0; index < entries.length; index += 1) {
            const validated = validateFavoriteEntry(entries[index], normalizedKey, index);
            if (isValidationError(validated)) {
                return validated;
            }
            normalizedEntries.push(validated);
            totalFavorites += 1;
            if (totalFavorites > MAX_BACKUP_FAVORITES) {
                return invalidPayload("백업 파일의 즐겨찾기 수가 너무 많아요.", {
                    max: MAX_BACKUP_FAVORITES,
                });
            }
        }

        normalizedFavorites[normalizedKey] = normalizedEntries;
    }

    for (const username of userSet) {
        if (!normalizedFavorites[username]) {
            normalizedFavorites[username] = [];
        }
    }

    return {
        favorites: normalizedFavorites,
        totalFavorites,
    };
}

function validateReviewProgressEntry(
    value: unknown,
    username: string,
    wordKey: string,
): ReviewProgressEntry | ValidationError {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return invalidPayload("백업 파일의 복습 진행도 형식이 올바르지 않아요.", {
            username,
            wordKey,
        });
    }

    const record = value as Partial<ReviewProgressEntry>;
    const normalizedWord = normalizeReviewWordKey(record.word) || wordKey;
    if (!normalizedWord) {
        return invalidPayload("백업 파일의 복습 진행도 단어 키가 올바르지 않아요.", {
            username,
            wordKey,
        });
    }

    return {
        word: normalizedWord,
        lastReviewedAt: typeof record.lastReviewedAt === "string" ? record.lastReviewedAt : null,
        nextReviewAt: typeof record.nextReviewAt === "string" ? record.nextReviewAt : null,
        reviewCount: normalizeReviewMetric(record.reviewCount),
        correctStreak: normalizeReviewMetric(record.correctStreak),
        incorrectCount: normalizeReviewMetric(record.incorrectCount),
        lastOutcome: normalizeReviewOutcome(record.lastOutcome),
    };
}

function validateReviewProgress(
    reviewProgress: unknown,
    userSet: Set<string>,
    version: 1 | 2,
): { reviewProgress: Record<string, ReviewProgressMap> } | ValidationError {
    if (version === 1 || reviewProgress == null) {
        return {
            reviewProgress: Object.fromEntries(Array.from(userSet).map((username) => [username, {}])),
        };
    }

    if (typeof reviewProgress !== "object" || Array.isArray(reviewProgress)) {
        return invalidPayload("백업 파일의 reviewProgress 항목이 올바르지 않아요.");
    }

    const normalizedReviewProgress: Record<string, ReviewProgressMap> = {};
    let totalEntries = 0;

    for (const [rawUsername, entries] of Object.entries(reviewProgress as Record<string, unknown>)) {
        const normalizedUsername = rawUsername.trim().toLowerCase();
        if (!normalizedUsername) {
            return invalidPayload("백업 파일의 reviewProgress 사용자 키가 비어 있어요.");
        }
        if (!userSet.has(normalizedUsername)) {
            return invalidPayload("백업 파일의 reviewProgress가 존재하지 않는 사용자와 연결되어 있어요.", {
                username: normalizedUsername,
            });
        }
        if (!entries || typeof entries !== "object" || Array.isArray(entries)) {
            return invalidPayload("백업 파일의 reviewProgress 항목이 올바르지 않아요.", {
                username: normalizedUsername,
            });
        }

        const normalizedEntries: ReviewProgressMap = {};
        for (const [rawWordKey, entry] of Object.entries(entries as Record<string, unknown>)) {
            const normalizedWordKey = normalizeReviewWordKey(rawWordKey);
            if (!normalizedWordKey) {
                return invalidPayload("백업 파일의 reviewProgress 단어 키가 비어 있어요.", {
                    username: normalizedUsername,
                });
            }

            const validatedEntry = validateReviewProgressEntry(entry, normalizedUsername, normalizedWordKey);
            if (isValidationError(validatedEntry)) {
                return validatedEntry;
            }

            normalizedEntries[normalizedWordKey] = validatedEntry;
            totalEntries += 1;
            if (totalEntries > MAX_BACKUP_REVIEW_PROGRESS) {
                return invalidPayload("백업 파일의 복습 진행도 항목 수가 너무 많아요.", {
                    max: MAX_BACKUP_REVIEW_PROGRESS,
                });
            }
        }

        normalizedReviewProgress[normalizedUsername] = normalizedEntries;
    }

    for (const username of userSet) {
        if (!normalizedReviewProgress[username]) {
            normalizedReviewProgress[username] = {};
        }
    }

    return { reviewProgress: normalizedReviewProgress };
}

function validateSearchHistory(searchHistory: unknown): SearchHistoryEntry[] | ValidationError {
    if (!Array.isArray(searchHistory)) {
        return invalidPayload("백업 파일의 searchHistory 항목이 올바르지 않아요.");
    }
    if (searchHistory.length > MAX_BACKUP_SEARCH_HISTORY) {
        return invalidPayload("백업 파일의 검색 이력 수가 너무 많아요.", {
            max: MAX_BACKUP_SEARCH_HISTORY,
            searchHistory: searchHistory.length,
        });
    }

    const normalized: SearchHistoryEntry[] = [];
    for (let index = 0; index < searchHistory.length; index += 1) {
        const candidate = searchHistory[index];
        if (typeof candidate !== "object" || candidate === null) {
            return invalidPayload("백업 파일의 검색 이력 형식이 올바르지 않아요.", { index });
        }
        const entry = candidate as Partial<SearchHistoryEntry>;
        if (typeof entry.term !== "string" || !entry.term.trim()) {
            return invalidPayload("백업 파일의 검색어가 올바르지 않아요.", { index });
        }
        if (entry.mode !== "en-en") {
            return invalidPayload("백업 파일의 검색 모드가 올바르지 않아요.", {
                index,
                mode: entry.mode,
            });
        }
        if (typeof entry.searchedAt !== "string" || !entry.searchedAt.trim()) {
            return invalidPayload("백업 파일의 검색 시각이 올바르지 않아요.", { index });
        }
        normalized.push({
            term: entry.term,
            mode: entry.mode,
            searchedAt: entry.searchedAt,
        });
    }

    return normalized;
}

export function validateBackupPayload(payload: unknown): ValidateBackupPayloadResult {
    if (!payload || typeof payload !== "object") {
        return invalidPayload("백업 파일 구조가 올바르지 않아요.");
    }

    const record = payload as {
        version?: unknown;
        exportedAt?: unknown;
        users?: unknown;
        favorites?: unknown;
        searchHistory?: unknown;
    };

    const versionNumber =
        typeof record.version === "number"
            ? record.version
            : typeof record.version === "string"
              ? Number(record.version)
              : Number.NaN;

    if (!Number.isInteger(versionNumber)) {
        return invalidPayload("백업 파일 버전을 확인할 수 없어요.", {
            version: record.version,
        });
    }

    if (!SUPPORTED_BACKUP_VERSIONS.has(versionNumber)) {
        return createRestoreError("UNSUPPORTED_VERSION", "지원하지 않는 백업 형식이에요.", {
            version: versionNumber,
            latestVersion: LATEST_BACKUP_VERSION,
            supportedVersions: Array.from(SUPPORTED_BACKUP_VERSIONS),
        }) as ValidationError;
    }

    if (typeof record.exportedAt !== "string" || !record.exportedAt.trim()) {
        return invalidPayload("백업 생성 시각이 올바르지 않아요.");
    }

    const validatedUsers = validateUsers(record.users);
    if (isValidationError(validatedUsers)) {
        return validatedUsers;
    }

    const validatedFavorites = validateFavorites(record.favorites, validatedUsers.userSet);
    if (isValidationError(validatedFavorites)) {
        return validatedFavorites;
    }

    const validatedReviewProgress = validateReviewProgress(
        (record as { reviewProgress?: unknown }).reviewProgress,
        validatedUsers.userSet,
        versionNumber as 1 | 2,
    );
    if (isValidationError(validatedReviewProgress)) {
        return validatedReviewProgress;
    }

    const validatedSearchHistory = validateSearchHistory(record.searchHistory);
    if (isValidationError(validatedSearchHistory)) {
        return validatedSearchHistory;
    }

    return {
        ok: true,
        parsed: {
            version: versionNumber as 1 | 2,
            exportedAt: record.exportedAt,
            users: validatedUsers.users,
            favorites: validatedFavorites.favorites,
            reviewProgress: validatedReviewProgress.reviewProgress,
            searchHistory: validatedSearchHistory,
        },
    };
}
