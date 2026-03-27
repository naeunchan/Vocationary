import { createRestoreSuccess, type RestoreResult } from "@/services/backup/restoreResult";
import { validateBackupPayload } from "@/services/backup/validateBackupPayload";
import { getSearchHistoryState, setSearchHistoryState } from "@/services/database/searchHistory";
import {
    cloneFavorites,
    cloneReviewProgressMap,
    cloneUsers,
    ensureStateLoaded,
    memoryState,
    normalizeNullableString,
    normalizeUsername,
    persistState,
    setNextUserId,
} from "@/services/database/state";
import type { FavoriteWordEntry } from "@/services/favorites/types";
import type { ReviewProgressMap } from "@/services/review/types";
import type { SearchHistoryEntry } from "@/services/searchHistory/types";

type BackupPayloadBase = {
    exportedAt: string;
    users: {
        username: string;
        display_name: string | null;
        phone_number: string | null;
        password_hash: string | null;
        oauth_provider: string | null;
        oauth_sub: string | null;
    }[];
    favorites: Record<string, FavoriteWordEntry[]>;
    searchHistory: SearchHistoryEntry[];
};

export type BackupPayloadV1 = BackupPayloadBase & {
    version: 1;
};

export type BackupPayloadV2 = BackupPayloadBase & {
    version: 2;
    reviewProgress?: Record<string, ReviewProgressMap>;
};

export type BackupPayload = BackupPayloadV1 | BackupPayloadV2;

export async function exportBackup(): Promise<BackupPayloadV2> {
    await ensureStateLoaded();

    const userRows = cloneUsers(memoryState.users);
    const users = userRows.map((user) => ({
        username: user.username,
        display_name: user.display_name,
        phone_number: user.phone_number,
        password_hash: user.password_hash,
        oauth_provider: user.oauth_provider,
        oauth_sub: user.oauth_sub,
    }));

    const favorites: Record<string, FavoriteWordEntry[]> = {};
    const reviewProgress: Record<string, ReviewProgressMap> = {};
    for (const user of userRows) {
        favorites[user.username] = cloneFavorites(memoryState.favoritesByUser[user.id] ?? []);
        reviewProgress[user.username] = cloneReviewProgressMap(memoryState.reviewProgressByUser[user.id] ?? {});
    }

    return {
        version: 2,
        exportedAt: new Date().toISOString(),
        users,
        favorites,
        reviewProgress,
        searchHistory: getSearchHistoryState(),
    };
}

export async function importBackup(payload: BackupPayload): Promise<RestoreResult> {
    await ensureStateLoaded();

    const validationResult = validateBackupPayload(payload);
    if (!validationResult.ok) {
        return validationResult;
    }

    const parsed = validationResult.parsed;
    const nextUsers: {
        id: number;
        username: string;
        display_name: string | null;
        phone_number: string | null;
        password_hash: string | null;
        oauth_provider: string | null;
        oauth_sub: string | null;
    }[] = [];
    const nextFavoritesByUser: Record<number, FavoriteWordEntry[]> = {};
    const nextReviewProgressByUser: Record<number, ReviewProgressMap> = {};

    let localNextUserId = 1;
    for (const user of parsed.users) {
        const id = localNextUserId;
        localNextUserId += 1;
        nextUsers.push({
            id,
            username: normalizeUsername(user.username),
            display_name: normalizeNullableString(user.display_name),
            phone_number: normalizeNullableString(user.phone_number),
            password_hash: normalizeNullableString(user.password_hash),
            oauth_provider: normalizeNullableString(user.oauth_provider),
            oauth_sub: normalizeNullableString(user.oauth_sub),
        });

        nextFavoritesByUser[id] = cloneFavorites(parsed.favorites[normalizeUsername(user.username)] ?? []);
        nextReviewProgressByUser[id] = cloneReviewProgressMap(
            parsed.reviewProgress[normalizeUsername(user.username)] ?? {},
        );
    }

    memoryState.users = nextUsers;
    memoryState.favoritesByUser = nextFavoritesByUser;
    memoryState.reviewProgressByUser = nextReviewProgressByUser;
    memoryState.session = null;
    memoryState.autoLogin = null;
    setSearchHistoryState(parsed.searchHistory);
    setNextUserId(localNextUserId);
    await persistState();

    const totalFavorites = Object.values(nextFavoritesByUser).reduce((count, entries) => count + entries.length, 0);

    return createRestoreSuccess({
        users: nextUsers.length,
        favorites: totalFavorites,
        searchHistory: parsed.searchHistory.length,
    });
}
