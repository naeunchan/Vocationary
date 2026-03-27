import AsyncStorage from "@react-native-async-storage/async-storage";

import type { DictionaryMode } from "@/services/dictionary/types";
import type { FavoriteWordEntry } from "@/services/favorites/types";
import type { ReviewOutcome, ReviewProgressEntry, ReviewProgressMap } from "@/services/review/types";
import type { SearchHistoryEntry } from "@/services/searchHistory/types";
import { SEARCH_HISTORY_LIMIT } from "@/services/searchHistory/types";

export const PASSWORD_HASH_PREFIX = "sha256.v1";
export const LEGACY_PASSWORD_SALT = "vocachip::salt";
export const EMAIL_VERIFICATION_EXPIRY_MS = 10 * 60 * 1000;
export const SEARCH_HISTORY_KEY = "search.history";
export const DATABASE_STATE_STORAGE_KEY = "vocachip.database.state.v1";

type UserRow = {
    id: number;
    username: string;
    display_name: string | null;
    phone_number: string | null;
    password_hash: string | null;
    oauth_provider: string | null;
    oauth_sub: string | null;
};

type SessionState = {
    isGuest: boolean;
    userId: number | null;
};

type AutoLoginState = {
    username: string;
    passwordHash: string;
};

type EmailVerificationState = {
    code: string;
    expires_at: string;
    verified_at: string | null;
    updated_at: string;
};

export type UserRecord = {
    id: number;
    username: string;
    displayName: string | null;
    phoneNumber: string | null;
};

export type UserWithPasswordRecord = UserRecord & {
    passwordHash: string | null;
};

export type OAuthProvider = "firebase";

export type OAuthProfilePayload = {
    provider: OAuthProvider;
    subject: string;
    email: string;
    displayName?: string | null;
    phoneNumber?: string | null;
};

export type EmailVerificationConsumeStatus = "verified" | "not_found" | "invalid_code" | "expired" | "already_used";
export type PasswordResetByEmailStatus = "success" | "email_not_found" | "invalid_code" | "expired" | "already_used";

type MemoryState = {
    users: UserRow[];
    favoritesByUser: Record<number, FavoriteWordEntry[]>;
    reviewProgressByUser: Record<number, ReviewProgressMap>;
    searchHistory: SearchHistoryEntry[];
    session: SessionState | null;
    autoLogin: AutoLoginState | null;
    preferences: Record<string, string>;
    emailVerifications: Record<string, EmailVerificationState>;
};

type PersistedState = {
    version: 1;
    state: MemoryState;
};

function createInitialMemoryState(): MemoryState {
    return {
        users: [],
        favoritesByUser: {},
        reviewProgressByUser: {},
        searchHistory: [],
        session: null,
        autoLogin: null,
        preferences: {},
        emailVerifications: {},
    };
}

export const memoryState: MemoryState = createInitialMemoryState();

let nextUserId = 1;
let loadStatePromise: Promise<void> | null = null;
let persistStatePromise: Promise<void> = Promise.resolve();
let hasLoadedState = false;

export function allocateUserId() {
    const id = nextUserId;
    nextUserId += 1;
    return id;
}

export function setNextUserId(nextId: number) {
    nextUserId = nextId;
}

export function resetNextUserIdFromUsers(users: UserRow[]) {
    nextUserId = Math.max(0, ...users.map((user) => user.id)) + 1;
}

export function createEmptyState() {
    return createInitialMemoryState();
}

export function mapUserRow(row: UserRow, fallbackDisplayName?: string): UserRecord {
    return {
        id: row.id,
        username: row.username,
        displayName: row.display_name ?? fallbackDisplayName ?? null,
        phoneNumber: row.phone_number ?? null,
    };
}

export function mapUserRowWithPassword(row: UserRow, fallbackDisplayName?: string): UserWithPasswordRecord {
    return {
        ...mapUserRow(row, fallbackDisplayName),
        passwordHash: row.password_hash ?? null,
    };
}

export function normalizeUsername(username: string): string {
    return username.trim().toLowerCase();
}

export function normalizeNullableString(value: unknown): string | null {
    if (typeof value !== "string") {
        return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

export function cloneFavoriteEntry(entry: FavoriteWordEntry): FavoriteWordEntry {
    return {
        ...entry,
        word: { ...entry.word },
    };
}

export function cloneFavorites(entries: FavoriteWordEntry[]): FavoriteWordEntry[] {
    return entries.map(cloneFavoriteEntry);
}

function normalizeReviewWordKey(word: string): string {
    return word.trim().toLowerCase();
}

function normalizeReviewMetric(value: unknown): number {
    if (typeof value !== "number" || !Number.isFinite(value)) {
        return 0;
    }

    return Math.max(0, Math.round(value));
}

function normalizeReviewOutcome(value: unknown): ReviewOutcome | null {
    return value === "again" || value === "good" || value === "easy" ? value : null;
}

export function cloneReviewProgressEntry(entry: ReviewProgressEntry): ReviewProgressEntry {
    return {
        word: normalizeReviewWordKey(entry.word),
        lastReviewedAt: entry.lastReviewedAt,
        nextReviewAt: entry.nextReviewAt,
        reviewCount: normalizeReviewMetric(entry.reviewCount),
        correctStreak: normalizeReviewMetric(entry.correctStreak),
        incorrectCount: normalizeReviewMetric(entry.incorrectCount),
        lastOutcome: normalizeReviewOutcome(entry.lastOutcome),
    };
}

export function cloneReviewProgressMap(progress: ReviewProgressMap): ReviewProgressMap {
    return Object.fromEntries(
        Object.entries(progress)
            .map(([rawKey, entry]) => {
                const normalizedKey = normalizeReviewWordKey(rawKey || entry.word);
                if (!normalizedKey) {
                    return null;
                }

                return [
                    normalizedKey,
                    cloneReviewProgressEntry({
                        ...entry,
                        word: normalizedKey,
                    }),
                ] satisfies [string, ReviewProgressEntry];
            })
            .filter((entry): entry is [string, ReviewProgressEntry] => Boolean(entry)),
    );
}

export function cloneSearchHistory(entries: SearchHistoryEntry[]): SearchHistoryEntry[] {
    return entries.map((entry) => ({ ...entry }));
}

export function cloneUsers(users: UserRow[]): UserRow[] {
    return users.map((user) => ({ ...user }));
}

export function cloneEmailVerifications(
    records: Record<string, EmailVerificationState>,
): Record<string, EmailVerificationState> {
    return Object.fromEntries(Object.entries(records).map(([key, value]) => [key, { ...value }]));
}

export function clonePreferences(preferences: Record<string, string>): Record<string, string> {
    return Object.fromEntries(
        Object.entries(preferences)
            .filter((entry): entry is [string, string] => typeof entry[0] === "string" && typeof entry[1] === "string")
            .map(([key, value]) => [key, value]),
    );
}

export function cloneMemoryState(state: MemoryState): MemoryState {
    return {
        users: cloneUsers(state.users),
        favoritesByUser: Object.fromEntries(
            Object.entries(state.favoritesByUser).map(([userId, entries]) => [Number(userId), cloneFavorites(entries)]),
        ),
        reviewProgressByUser: Object.fromEntries(
            Object.entries(state.reviewProgressByUser).map(([userId, progress]) => [
                Number(userId),
                cloneReviewProgressMap(progress),
            ]),
        ),
        searchHistory: cloneSearchHistory(state.searchHistory),
        session: state.session ? { ...state.session } : null,
        autoLogin: state.autoLogin ? { ...state.autoLogin } : null,
        preferences: clonePreferences(state.preferences),
        emailVerifications: cloneEmailVerifications(state.emailVerifications),
    };
}

function replaceMemoryState(nextState: MemoryState) {
    const normalized = cloneMemoryState(nextState);
    memoryState.users = normalized.users;
    memoryState.favoritesByUser = normalized.favoritesByUser;
    memoryState.reviewProgressByUser = normalized.reviewProgressByUser;
    memoryState.searchHistory = normalized.searchHistory;
    memoryState.session = normalized.session;
    memoryState.autoLogin = normalized.autoLogin;
    memoryState.preferences = normalized.preferences;
    memoryState.emailVerifications = normalized.emailVerifications;
    resetNextUserIdFromUsers(memoryState.users);
}

export function normalizeSearchHistoryMode(mode: unknown): DictionaryMode {
    return mode === "en-en" ? "en-en" : "en-en";
}

export function normalizeSearchHistoryEntries(entries: SearchHistoryEntry[]) {
    return entries
        .filter((entry) => entry && typeof entry.term === "string")
        .map((entry) => ({
            term: entry.term,
            mode: normalizeSearchHistoryMode(entry.mode),
            searchedAt: typeof entry.searchedAt === "string" ? entry.searchedAt : new Date().toISOString(),
        }));
}

export function normalizePersistedUsers(value: unknown): UserRow[] {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .filter((row): row is Partial<UserRow> => Boolean(row) && typeof row === "object")
        .map((row, index) => ({
            id: typeof row.id === "number" && Number.isFinite(row.id) && row.id > 0 ? row.id : index + 1,
            username: normalizeUsername(typeof row.username === "string" ? row.username : ""),
            display_name: normalizeNullableString(row.display_name),
            phone_number: normalizeNullableString(row.phone_number),
            password_hash: normalizeNullableString(row.password_hash),
            oauth_provider: normalizeNullableString(row.oauth_provider),
            oauth_sub: normalizeNullableString(row.oauth_sub),
        }))
        .filter((row) => Boolean(row.username));
}

export function normalizePersistedFavorites(value: unknown): Record<number, FavoriteWordEntry[]> {
    if (!value || typeof value !== "object") {
        return {};
    }

    return Object.fromEntries(
        Object.entries(value)
            .filter(([key, entries]) => Number.isFinite(Number(key)) && Array.isArray(entries))
            .map(([key, entries]) => [Number(key), cloneFavorites(entries as FavoriteWordEntry[])]),
    );
}

export function normalizePersistedReviewProgress(value: unknown): ReviewProgressMap {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return {};
    }

    return Object.fromEntries(
        Object.entries(value)
            .filter(([, entry]) => Boolean(entry) && typeof entry === "object" && !Array.isArray(entry))
            .map(([rawKey, entry]) => {
                const record = entry as Partial<ReviewProgressEntry>;
                const normalizedKey = normalizeReviewWordKey(
                    rawKey || (typeof record.word === "string" ? record.word : ""),
                );
                if (!normalizedKey) {
                    return null;
                }

                return [
                    normalizedKey,
                    {
                        word: normalizedKey,
                        lastReviewedAt: typeof record.lastReviewedAt === "string" ? record.lastReviewedAt : null,
                        nextReviewAt: typeof record.nextReviewAt === "string" ? record.nextReviewAt : null,
                        reviewCount: normalizeReviewMetric(record.reviewCount),
                        correctStreak: normalizeReviewMetric(record.correctStreak),
                        incorrectCount: normalizeReviewMetric(record.incorrectCount),
                        lastOutcome: normalizeReviewOutcome(record.lastOutcome),
                    },
                ] satisfies [string, ReviewProgressEntry];
            })
            .filter((entry): entry is [string, ReviewProgressEntry] => Boolean(entry)),
    );
}

export function normalizePersistedReviewProgressByUser(value: unknown): Record<number, ReviewProgressMap> {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return {};
    }

    return Object.fromEntries(
        Object.entries(value)
            .filter(([key]) => Number.isFinite(Number(key)))
            .map(([key, progress]) => [Number(key), normalizePersistedReviewProgress(progress)]),
    );
}

export function normalizePersistedSearchHistory(value: unknown): SearchHistoryEntry[] {
    if (!Array.isArray(value)) {
        return [];
    }

    return normalizeSearchHistoryEntries(value as SearchHistoryEntry[]).slice(0, SEARCH_HISTORY_LIMIT);
}

export function normalizePersistedPreferences(value: unknown): Record<string, string> {
    if (!value || typeof value !== "object") {
        return {};
    }

    return Object.fromEntries(
        Object.entries(value).filter(
            (entry): entry is [string, string] => typeof entry[0] === "string" && typeof entry[1] === "string",
        ),
    );
}

export function normalizePersistedEmailVerifications(value: unknown): Record<string, EmailVerificationState> {
    if (!value || typeof value !== "object") {
        return {};
    }

    return Object.fromEntries(
        Object.entries(value)
            .filter(([, entry]) => Boolean(entry) && typeof entry === "object")
            .map(([email, entry]) => {
                const record = entry as Partial<EmailVerificationState>;
                return [
                    normalizeUsername(email),
                    {
                        code: typeof record.code === "string" ? record.code : "",
                        expires_at:
                            typeof record.expires_at === "string" ? record.expires_at : new Date(0).toISOString(),
                        verified_at: typeof record.verified_at === "string" ? record.verified_at : null,
                        updated_at:
                            typeof record.updated_at === "string" ? record.updated_at : new Date(0).toISOString(),
                    },
                ] satisfies [string, EmailVerificationState];
            })
            .filter(([email, record]) => Boolean(email) && Boolean(record.code)),
    );
}

export function normalizePersistedSession(value: unknown): SessionState | null {
    if (!value || typeof value !== "object") {
        return null;
    }

    const session = value as Partial<SessionState>;
    const userId = typeof session.userId === "number" && Number.isFinite(session.userId) ? session.userId : null;

    return {
        isGuest: Boolean(session.isGuest),
        userId,
    };
}

export function normalizePersistedAutoLogin(value: unknown): AutoLoginState | null {
    if (!value || typeof value !== "object") {
        return null;
    }

    const autoLogin = value as Partial<AutoLoginState>;
    if (typeof autoLogin.username !== "string" || typeof autoLogin.passwordHash !== "string") {
        return null;
    }

    return {
        username: normalizeUsername(autoLogin.username),
        passwordHash: autoLogin.passwordHash,
    };
}

export function normalizePersistedState(value: unknown): MemoryState {
    const fallback = createInitialMemoryState();
    if (!value || typeof value !== "object") {
        return fallback;
    }

    const candidate =
        "version" in value && (value as Partial<PersistedState>).version === 1
            ? (value as PersistedState).state
            : value;

    if (!candidate || typeof candidate !== "object") {
        return fallback;
    }

    const state = candidate as Partial<MemoryState>;
    const normalizedSearchHistory = normalizePersistedSearchHistory(state.searchHistory);
    const preferences = normalizePersistedPreferences(state.preferences);

    if (!preferences[SEARCH_HISTORY_KEY] && normalizedSearchHistory.length > 0) {
        preferences[SEARCH_HISTORY_KEY] = JSON.stringify(normalizedSearchHistory);
    }

    return {
        users: normalizePersistedUsers(state.users),
        favoritesByUser: normalizePersistedFavorites(state.favoritesByUser),
        reviewProgressByUser: normalizePersistedReviewProgressByUser(state.reviewProgressByUser),
        searchHistory: normalizedSearchHistory,
        session: normalizePersistedSession(state.session),
        autoLogin: normalizePersistedAutoLogin(state.autoLogin),
        preferences,
        emailVerifications: normalizePersistedEmailVerifications(state.emailVerifications),
    };
}

export async function ensureStateLoaded() {
    if (hasLoadedState) {
        return;
    }

    if (!loadStatePromise) {
        loadStatePromise = (async () => {
            try {
                const serialized = await AsyncStorage.getItem(DATABASE_STATE_STORAGE_KEY);
                if (serialized) {
                    replaceMemoryState(normalizePersistedState(JSON.parse(serialized)));
                } else {
                    replaceMemoryState(createInitialMemoryState());
                }
            } catch (error) {
                console.warn("데이터 저장소를 복원하는 중 문제가 발생했어요.", error);
                replaceMemoryState(createInitialMemoryState());
                try {
                    await AsyncStorage.removeItem(DATABASE_STATE_STORAGE_KEY);
                } catch {
                    // Ignore cleanup failures and continue with a fresh state.
                }
            } finally {
                hasLoadedState = true;
            }
        })().finally(() => {
            loadStatePromise = null;
        });
    }

    await loadStatePromise;
}

export async function persistState() {
    await ensureStateLoaded();

    persistStatePromise = persistStatePromise
        .catch(() => undefined)
        .then(() =>
            AsyncStorage.setItem(
                DATABASE_STATE_STORAGE_KEY,
                JSON.stringify({
                    version: 1,
                    state: cloneMemoryState(memoryState),
                } satisfies PersistedState),
            ),
        );

    await persistStatePromise;
}

export async function initializeDatabase() {
    await ensureStateLoaded();
}
