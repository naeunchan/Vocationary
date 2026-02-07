import { Buffer } from "buffer";
import * as Crypto from "expo-crypto";
import { getRandomBytesAsync } from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import type { SQLiteDatabase } from "expo-sqlite";
import { Platform } from "react-native";

import type { DictionaryMode, WordResult } from "@/services/dictionary/types";
import {
    createFavoriteEntry,
    FavoriteWordEntry,
    isMemorizationStatus,
    MemorizationStatus,
} from "@/services/favorites/types";
import type { SearchHistoryEntry } from "@/services/searchHistory/types";
import { SEARCH_HISTORY_LIMIT } from "@/services/searchHistory/types";

const DATABASE_NAME = "vocationary.db";
const PASSWORD_HASH_PREFIX = "sha256.v1";
const LEGACY_PASSWORD_SALT = "vocationary::salt";
const isWeb = Platform.OS === "web";
const APP_HELP_KEY = "app.help.seen";
const SEARCH_HISTORY_KEY = "search.history";

type ExpoSQLiteModule = typeof import("expo-sqlite");

function getNativeSQLiteModule(): ExpoSQLiteModule {
    return require("expo-sqlite") as ExpoSQLiteModule;
}

type UserRow = {
    id: number;
    username: string;
    display_name: string | null;
    phone_number: string | null;
    password_hash: string | null;
    oauth_provider: string | null;
    oauth_sub: string | null;
};

type SessionRow = {
    user_id: number | null;
    is_guest: number;
};

type EmailVerificationRow = {
    email: string;
    code: string;
    expires_at: string;
    verified_at: string | null;
};

const EMAIL_VERIFICATION_EXPIRY_MS = 10 * 60 * 1000;

type EmailVerificationPayload = {
    code: string;
    expiresAt: string;
};

export type UserRecord = {
    id: number;
    username: string;
    displayName: string | null;
    phoneNumber: string | null;
    oauthProvider?: string | null;
    oauthSubject?: string | null;
};

type UserWithPasswordRecord = UserRecord & {
    passwordHash: string | null;
};

export type OAuthProvider = "google" | "apple";

export type OAuthProfilePayload = {
    provider: OAuthProvider;
    subject: string;
    email: string;
    displayName?: string | null;
};

let databasePromise: Promise<SQLiteDatabase> | null = null;

async function getDatabase() {
    if (isWeb) {
        throw new Error("웹 환경에서는 SQLite 데이터베이스를 사용할 수 없어요.");
    }

    if (!databasePromise) {
        const { openDatabaseAsync } = getNativeSQLiteModule();
        databasePromise = openDatabaseAsync(DATABASE_NAME);
    }
    return await databasePromise;
}

function mapUserRow(row: UserRow, fallbackDisplayName?: string): UserRecord {
    return {
        id: row.id,
        username: row.username,
        displayName: row.display_name ?? fallbackDisplayName ?? null,
        phoneNumber: row.phone_number ?? null,
        oauthProvider: row.oauth_provider ?? null,
        oauthSubject: row.oauth_sub ?? null,
    };
}

function mapUserRowWithPassword(row: UserRow, fallbackDisplayName?: string): UserWithPasswordRecord {
    return {
        ...mapUserRow(row, fallbackDisplayName),
        passwordHash: row.password_hash ?? null,
    };
}

function fnv1a32(input: string) {
    let hash = 0x811c9dc5;
    for (let index = 0; index < input.length; index += 1) {
        hash ^= input.charCodeAt(index);
        hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
}

function hashLegacyPassword(password: string) {
    const firstPass = fnv1a32(`${LEGACY_PASSWORD_SALT}:${password}`);
    const secondPass = fnv1a32(`${firstPass}:${password}`);
    return `${firstPass}${secondPass}`;
}

async function generatePasswordSalt(byteLength = 16) {
    const randomBytes = await getRandomBytesAsync(byteLength);
    return Buffer.from(randomBytes).toString("base64");
}

async function derivePasswordDigest(password: string, salt: string) {
    return await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${password}`);
}

export async function hashPassword(password: string, salt?: string) {
    const normalizedSalt = salt ?? (await generatePasswordSalt());
    const digest = await derivePasswordDigest(password, normalizedSalt);
    return `${PASSWORD_HASH_PREFIX}:${normalizedSalt}:${digest}`;
}

export async function verifyPasswordHash(password: string, storedHash: string | null) {
    if (!storedHash) {
        return false;
    }

    if (storedHash.startsWith(`${PASSWORD_HASH_PREFIX}:`)) {
        const [, salt, hashValue] = storedHash.split(":");
        if (!salt || !hashValue) {
            return false;
        }
        const digest = await derivePasswordDigest(password, salt);
        return digest === hashValue;
    }

    const legacyHash = hashLegacyPassword(password);
    return legacyHash === storedHash;
}

async function generateVerificationCode() {
    const bytes = await getRandomBytesAsync(4);
    const value = Buffer.from(bytes).readUInt32BE(0);
    return String(value % 1_000_000).padStart(6, "0");
}

function getVerificationExpiryTimestamp() {
    return new Date(Date.now() + EMAIL_VERIFICATION_EXPIRY_MS).toISOString();
}

function isVerificationExpired(expiresAt: string) {
    const expiryTime = new Date(expiresAt).getTime();
    return Number.isNaN(expiryTime) || expiryTime <= Date.now();
}

function normalizeFavoriteEntry(payload: unknown): FavoriteWordEntry | null {
    if (!payload || typeof payload !== "object") {
        return null;
    }

    const record = payload as Record<string, unknown>;
    const now = new Date().toISOString();

    if (record.word && typeof record.word === "object") {
        const wordData = record.word as WordResult;
        if (typeof wordData?.word !== "string") {
            return null;
        }
        const status = isMemorizationStatus(record.status) ? record.status : "toMemorize";
        const updatedAt = typeof record.updatedAt === "string" ? record.updatedAt : now;
        return {
            word: wordData,
            status,
            updatedAt,
        };
    }

    // Legacy payload (WordResult only)
    const legacyWord = record as WordResult;
    if (typeof legacyWord?.word === "string") {
        const entry = createFavoriteEntry(legacyWord, "toMemorize");
        return { ...entry, updatedAt: now };
    }

    return null;
}

function isDictionaryModeValue(value: unknown): value is DictionaryMode {
    return value === "en-en";
}

function normalizeSearchHistoryPayload(payload: string | null | undefined): SearchHistoryEntry[] {
    if (!payload) {
        return [];
    }

    try {
        const parsed = JSON.parse(payload);
        if (!Array.isArray(parsed)) {
            return [];
        }

        const normalized: SearchHistoryEntry[] = [];
        for (const candidate of parsed) {
            if (typeof candidate !== "object" || candidate === null) {
                continue;
            }
            const record = candidate as Partial<SearchHistoryEntry>;
            if (typeof record.term !== "string") {
                continue;
            }
            const mode: DictionaryMode = isDictionaryModeValue(record.mode) ? record.mode : "en-en";
            const searchedAt = typeof record.searchedAt === "string" ? record.searchedAt : new Date().toISOString();
            normalized.push({
                term: record.term,
                mode,
                searchedAt,
            });
            if (normalized.length >= SEARCH_HISTORY_LIMIT) {
                break;
            }
        }

        return normalized;
    } catch (error) {
        console.warn("검색 이력을 읽는 중 문제가 발생했어요.", error);
        return [];
    }
}

function serializeSearchHistoryPayload(entries: SearchHistoryEntry[]) {
    return JSON.stringify(entries.slice(0, SEARCH_HISTORY_LIMIT));
}

export type BackupPayload = {
    version: number;
    exportedAt: string;
    users: Pick<
        UserRow,
        "username" | "display_name" | "phone_number" | "password_hash" | "oauth_provider" | "oauth_sub"
    >[];
    favorites: Record<string, FavoriteWordEntry[]>;
    searchHistory: SearchHistoryEntry[];
};

export async function exportBackup(): Promise<BackupPayload> {
    const db = await getDatabase();
    const timestamp = new Date().toISOString();
    const users = await db.getAllAsync<
        Pick<UserRow, "username" | "display_name" | "phone_number" | "password_hash" | "oauth_provider" | "oauth_sub">
    >("SELECT username, display_name, phone_number, password_hash, oauth_provider, oauth_sub FROM users");
    const favorites: Record<string, FavoriteWordEntry[]> = {};

    for (const user of users) {
        const favoriteRows = await db.getAllAsync<{ data: string }>(
            "SELECT data FROM favorites f JOIN users u ON u.id = f.user_id WHERE u.username = ?",
            user.username,
        );
        favorites[user.username] = favoriteRows
            .map((row) => {
                try {
                    return normalizeFavoriteEntry(JSON.parse(row.data));
                } catch {
                    return null;
                }
            })
            .filter((entry): entry is FavoriteWordEntry => entry !== null);
    }

    const searchHistory = await getSearchHistoryNative();

    return {
        version: 1,
        exportedAt: timestamp,
        users,
        favorites,
        searchHistory,
    };
}

export async function importBackup(payload: BackupPayload) {
    if (payload?.version !== 1) {
        throw new Error("지원하지 않는 백업 형식이에요.");
    }
    const db = await getDatabase();
    await db.withTransactionAsync(async (tx) => {
        for (const user of payload.users) {
            const normalizedUsername = user.username.toLowerCase();
            let existing = await tx.getFirstAsync<UserRow>(
                "SELECT id FROM users WHERE username = ?",
                normalizedUsername,
            );
            if (!existing) {
                await tx.runAsync(
                    "INSERT INTO users (username, display_name, phone_number, password_hash, oauth_provider, oauth_sub) VALUES (?, ?, ?, ?, ?, ?)",
                    normalizedUsername,
                    user.display_name,
                    user.phone_number ?? null,
                    user.password_hash,
                    user.oauth_provider,
                    user.oauth_sub,
                );
                existing = await tx.getFirstAsync<UserRow>(
                    "SELECT id FROM users WHERE username = ?",
                    normalizedUsername,
                );
            } else {
                await tx.runAsync(
                    `UPDATE users
					SET display_name = ?, phone_number = ?, password_hash = ?, oauth_provider = ?, oauth_sub = ?, updated_at = CURRENT_TIMESTAMP
					WHERE id = ?`,
                    user.display_name,
                    user.phone_number ?? null,
                    user.password_hash,
                    user.oauth_provider,
                    user.oauth_sub,
                    existing.id,
                );
            }
            if (!existing) {
                continue;
            }
            await tx.runAsync("DELETE FROM favorites WHERE user_id = ?", existing.id);
            const favoriteEntries = payload.favorites[user.username] ?? [];
            for (const entry of favoriteEntries) {
                await tx.runAsync(
                    `
						INSERT INTO favorites (user_id, word, data, updated_at)
						VALUES (?, ?, ?, ?)
					`,
                    existing.id,
                    entry.word.word,
                    JSON.stringify(entry),
                    entry.updatedAt ?? new Date().toISOString(),
                );
            }
        }
    });
    await saveSearchHistoryNative(payload.searchHistory ?? []);
}

async function initializeDatabaseNative() {
    const db = await getDatabase();
    await db.execAsync("PRAGMA foreign_keys = ON;");
    await db.execAsync(`
		CREATE TABLE IF NOT EXISTS users (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			username TEXT NOT NULL UNIQUE,
			display_name TEXT,
			phone_number TEXT,
			password_hash TEXT,
			oauth_provider TEXT,
			oauth_sub TEXT,
			created_at TEXT DEFAULT CURRENT_TIMESTAMP,
			updated_at TEXT
		);
	`);
    const userColumns = await db.getAllAsync<{ name: string }>("PRAGMA table_info(users)");
    const hasPasswordColumn = userColumns.some((column) => column.name === "password_hash");
    if (!hasPasswordColumn) {
        await db.execAsync("ALTER TABLE users ADD COLUMN password_hash TEXT");
    }
    const hasPhoneColumn = userColumns.some((column) => column.name === "phone_number");
    if (!hasPhoneColumn) {
        await db.execAsync("ALTER TABLE users ADD COLUMN phone_number TEXT");
    }
    const hasOAuthProviderColumn = userColumns.some((column) => column.name === "oauth_provider");
    if (!hasOAuthProviderColumn) {
        await db.execAsync("ALTER TABLE users ADD COLUMN oauth_provider TEXT");
    }
    const hasOAuthSubColumn = userColumns.some((column) => column.name === "oauth_sub");
    if (!hasOAuthSubColumn) {
        await db.execAsync("ALTER TABLE users ADD COLUMN oauth_sub TEXT");
    }
    await db.execAsync(`
		CREATE UNIQUE INDEX IF NOT EXISTS idx_users_oauth_identity
		ON users(oauth_provider, oauth_sub)
	`);
    await db.execAsync(`
		CREATE TABLE IF NOT EXISTS favorites (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER NOT NULL,
			word TEXT NOT NULL,
			data TEXT NOT NULL,
			created_at TEXT DEFAULT CURRENT_TIMESTAMP,
			updated_at TEXT,
			UNIQUE(user_id, word),
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
		);
	`);
    await db.execAsync(`
		CREATE TABLE IF NOT EXISTS session (
			id INTEGER PRIMARY KEY CHECK (id = 1),
			user_id INTEGER,
			is_guest INTEGER NOT NULL DEFAULT 0,
			updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
		);
	`);
    await db.execAsync(`
		CREATE TABLE IF NOT EXISTS auto_login (
			id INTEGER PRIMARY KEY CHECK (id = 1),
			username TEXT NOT NULL,
			password_hash TEXT NOT NULL,
			updated_at TEXT DEFAULT CURRENT_TIMESTAMP
		);
	`);
    await db.execAsync(`
		CREATE TABLE IF NOT EXISTS app_preferences (
			key TEXT PRIMARY KEY,
			value TEXT NOT NULL,
			updated_at TEXT DEFAULT CURRENT_TIMESTAMP
		);
	`);
    await db.execAsync(`
		CREATE TABLE IF NOT EXISTS email_verifications (
			email TEXT PRIMARY KEY,
			code TEXT NOT NULL,
			expires_at TEXT NOT NULL,
			verified_at TEXT,
			updated_at TEXT DEFAULT CURRENT_TIMESTAMP
		);
	`);
}

const WEB_DB_STORAGE_KEY = "vocationary:web-db";

type WebFavoriteRow = {
    id: number;
    user_id: number;
    word: string;
    data: string;
    created_at: string;
    updated_at: string | null;
};

type WebSessionState = {
    user_id: number | null;
    is_guest: number;
    updated_at: string;
};

type WebAutoLoginState = {
    username: string;
    password_hash: string;
    updated_at: string;
};

type WebEmailVerificationState = {
    code: string;
    expires_at: string;
    verified_at: string | null;
    updated_at: string;
};

type WebDatabaseState = {
    users: UserRow[];
    favorites: WebFavoriteRow[];
    session: WebSessionState | null;
    autoLogin: WebAutoLoginState | null;
    preferences: Record<string, string>;
    emailVerifications: Record<string, WebEmailVerificationState>;
};

function cloneDefaultWebState(): WebDatabaseState {
    return {
        users: [],
        favorites: [],
        session: null,
        autoLogin: null,
        preferences: {},
        emailVerifications: {},
    };
}

function getBrowserStorage(): Storage | null {
    try {
        if (typeof window === "undefined" || !window.localStorage) {
            return null;
        }
        return window.localStorage;
    } catch (error) {
        console.warn("로컬 저장소에 접근하는 중 문제가 발생했어요.", error);
        return null;
    }
}

function normalizeUserRows(value: unknown): UserRow[] {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .map((candidate) => {
            if (typeof candidate !== "object" || candidate === null) {
                return null;
            }
            const row = candidate as Partial<UserRow>;
            if (typeof row.id !== "number" || typeof row.username !== "string") {
                return null;
            }
            return {
                id: row.id,
                username: row.username,
                display_name:
                    typeof row.display_name === "string" ? row.display_name : row.display_name === null ? null : null,
                phone_number:
                    typeof row.phone_number === "string" ? row.phone_number : row.phone_number === null ? null : null,
                password_hash:
                    typeof row.password_hash === "string"
                        ? row.password_hash
                        : row.password_hash === null
                          ? null
                          : null,
                oauth_provider:
                    typeof row.oauth_provider === "string"
                        ? row.oauth_provider
                        : row.oauth_provider === null
                          ? null
                          : null,
                oauth_sub: typeof row.oauth_sub === "string" ? row.oauth_sub : row.oauth_sub === null ? null : null,
            };
        })
        .filter((row): row is UserRow => row !== null);
}

function normalizeFavoriteRows(value: unknown): WebFavoriteRow[] {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .map((candidate) => {
            if (typeof candidate !== "object" || candidate === null) {
                return null;
            }
            const row = candidate as Partial<WebFavoriteRow>;
            if (
                typeof row.id !== "number" ||
                typeof row.user_id !== "number" ||
                typeof row.word !== "string" ||
                typeof row.data !== "string"
            ) {
                return null;
            }
            return {
                id: row.id,
                user_id: row.user_id,
                word: row.word,
                data: row.data,
                created_at: typeof row.created_at === "string" ? row.created_at : new Date().toISOString(),
                updated_at: typeof row.updated_at === "string" ? row.updated_at : row.updated_at === null ? null : null,
            };
        })
        .filter((row): row is WebFavoriteRow => row !== null);
}

function normalizeSession(value: unknown): WebSessionState | null {
    if (typeof value !== "object" || value === null) {
        return null;
    }
    const session = value as Partial<WebSessionState>;
    const userId = typeof session.user_id === "number" ? session.user_id : session.user_id === null ? null : null;
    const isGuest = typeof session.is_guest === "number" ? session.is_guest : null;
    if (isGuest !== 0 && isGuest !== 1) {
        return null;
    }
    return {
        user_id: userId,
        is_guest: isGuest,
        updated_at: typeof session.updated_at === "string" ? session.updated_at : new Date().toISOString(),
    };
}

function normalizeAutoLogin(value: unknown): WebAutoLoginState | null {
    if (typeof value !== "object" || value === null) {
        return null;
    }
    const state = value as Partial<WebAutoLoginState>;
    if (typeof state.username !== "string" || typeof state.password_hash !== "string") {
        return null;
    }
    return {
        username: state.username,
        password_hash: state.password_hash,
        updated_at: typeof state.updated_at === "string" ? state.updated_at : new Date().toISOString(),
    };
}

function normalizePreferences(value: unknown): Record<string, string> {
    if (typeof value !== "object" || value === null) {
        return {};
    }

    const record = value as Record<string, unknown>;
    const normalized: Record<string, string> = {};

    for (const key of Object.keys(record)) {
        const candidate = record[key];
        if (typeof candidate === "string") {
            normalized[key] = candidate;
        }
    }

    return normalized;
}

function normalizeEmailVerifications(value: unknown): Record<string, WebEmailVerificationState> {
    if (typeof value !== "object" || value === null) {
        return {};
    }

    const record = value as Record<string, unknown>;
    const normalized: Record<string, WebEmailVerificationState> = {};
    const fallbackTimestamp = new Date().toISOString();

    for (const key of Object.keys(record)) {
        const candidate = record[key];
        if (typeof candidate !== "object" || candidate === null) {
            continue;
        }
        const entry = candidate as Partial<WebEmailVerificationState>;
        if (typeof entry.code !== "string" || typeof entry.expires_at !== "string") {
            continue;
        }
        const normalizedKey = key.trim().toLowerCase();
        if (!normalizedKey) {
            continue;
        }
        normalized[normalizedKey] = {
            code: entry.code,
            expires_at: entry.expires_at,
            verified_at: typeof entry.verified_at === "string" ? entry.verified_at : null,
            updated_at: typeof entry.updated_at === "string" ? entry.updated_at : fallbackTimestamp,
        };
    }

    return normalized;
}

function readWebState(): WebDatabaseState {
    const storage = getBrowserStorage();
    if (!storage) {
        return cloneDefaultWebState();
    }

    const raw = storage.getItem(WEB_DB_STORAGE_KEY);
    if (!raw) {
        return cloneDefaultWebState();
    }

    try {
        const parsed = JSON.parse(raw) as Partial<WebDatabaseState>;
        return {
            users: normalizeUserRows(parsed.users),
            favorites: normalizeFavoriteRows(parsed.favorites),
            session: normalizeSession(parsed.session),
            autoLogin: normalizeAutoLogin(parsed.autoLogin),
            preferences: normalizePreferences(parsed.preferences),
            emailVerifications: normalizeEmailVerifications(parsed.emailVerifications),
        };
    } catch (error) {
        console.warn("저장된 데이터베이스 상태를 읽는 중 문제가 발생했어요.", error);
        return cloneDefaultWebState();
    }
}

function writeWebState(state: WebDatabaseState) {
    const storage = getBrowserStorage();
    if (!storage) {
        return;
    }

    try {
        storage.setItem(WEB_DB_STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
        console.warn("로컬 저장소에 데이터를 저장하는 중 문제가 발생했어요.", error);
    }
}

function generateWebUserId(users: UserRow[]) {
    return users.reduce((max, row) => (row.id > max ? row.id : max), 0) + 1;
}

function generateWebFavoriteId(favorites: WebFavoriteRow[]) {
    return favorites.reduce((max, row) => (row.id > max ? row.id : max), 0) + 1;
}

async function initializeDatabaseWeb() {
    const state = readWebState();
    writeWebState(state);
}

async function findUserByUsernameNative(username: string): Promise<UserWithPasswordRecord | null> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<UserRow>(
        "SELECT id, username, display_name, phone_number, password_hash, oauth_provider, oauth_sub FROM users WHERE username = ? LIMIT 1",
        [username],
    );

    if (rows.length === 0) {
        return null;
    }

    return mapUserRowWithPassword(rows[0]);
}

async function findUserByUsernameWeb(username: string): Promise<UserWithPasswordRecord | null> {
    const state = readWebState();
    const row = state.users.find((user) => user.username === username);
    return row ? mapUserRowWithPassword(row) : null;
}

async function createUserNative(username: string, password: string, displayName?: string, phoneNumber?: string | null) {
    const normalizedDisplayName = (displayName ?? username).trim() || username;
    const passwordHash = await hashPassword(password);
    const db = await getDatabase();

    await db.runAsync(
        "INSERT INTO users (username, display_name, phone_number, password_hash, oauth_provider, oauth_sub) VALUES (?, ?, ?, ?, NULL, NULL)",
        [username, normalizedDisplayName, phoneNumber ?? null, passwordHash],
    );

    const inserted = await db.getAllAsync<UserRow>(
        "SELECT id, username, display_name, phone_number, password_hash, oauth_provider, oauth_sub FROM users WHERE username = ? LIMIT 1",
        [username],
    );
    if (inserted.length === 0) {
        throw new Error("사용자 정보를 생성하지 못했어요.");
    }

    return mapUserRow(inserted[0], normalizedDisplayName);
}

async function createUserWeb(username: string, password: string, displayName?: string, phoneNumber?: string | null) {
    const state = readWebState();
    if (state.users.some((user) => user.username === username)) {
        throw new Error("이미 사용 중인 이메일이에요. 다른 이메일을 사용해주세요.");
    }

    const normalizedDisplayName = (displayName ?? username).trim() || username;
    const passwordHash = await hashPassword(password);
    const newUser: UserRow = {
        id: generateWebUserId(state.users),
        username,
        display_name: normalizedDisplayName,
        phone_number: phoneNumber ?? null,
        password_hash: passwordHash,
        oauth_provider: null,
        oauth_sub: null,
    };
    const nextState: WebDatabaseState = {
        ...state,
        users: [...state.users, newUser],
    };
    writeWebState(nextState);
    return mapUserRow(newUser, normalizedDisplayName);
}

function resolveOAuthDisplayName(email: string, displayName?: string | null) {
    const normalized = displayName?.trim();
    if (normalized) {
        return normalized;
    }
    const [local] = email.split("@");
    return local || email;
}

async function upsertOAuthUserNative(profile: OAuthProfilePayload): Promise<UserRecord> {
    const normalizedEmail = profile.email.trim().toLowerCase();
    const normalizedSubject = profile.subject.trim();
    if (!normalizedEmail || !normalizedSubject) {
        throw new Error("소셜 계정 정보를 확인하지 못했어요.");
    }

    const normalizedDisplayName = resolveOAuthDisplayName(normalizedEmail, profile.displayName);
    const db = await getDatabase();
    return await db.withTransactionAsync(async (tx) => {
        const existingBySub = await tx.getFirstAsync<UserRow>(
            "SELECT id, username, display_name, phone_number, password_hash, oauth_provider, oauth_sub FROM users WHERE oauth_provider = ? AND oauth_sub = ? LIMIT 1",
            profile.provider,
            normalizedSubject,
        );
        if (existingBySub) {
            await tx.runAsync(
                `UPDATE users
				SET username = ?, display_name = COALESCE(display_name, ?), updated_at = CURRENT_TIMESTAMP
				WHERE id = ?`,
                normalizedEmail,
                normalizedDisplayName,
                existingBySub.id,
            );
            const refreshed = await tx.getFirstAsync<UserRow>(
                "SELECT id, username, display_name, phone_number, password_hash, oauth_provider, oauth_sub FROM users WHERE id = ? LIMIT 1",
                existingBySub.id,
            );
            if (!refreshed) {
                throw new Error("소셜 계정을 갱신하지 못했어요.");
            }
            return mapUserRow(refreshed, normalizedDisplayName);
        }

        const existingByEmail = await tx.getFirstAsync<UserRow>(
            "SELECT id, username, display_name, phone_number, password_hash, oauth_provider, oauth_sub FROM users WHERE username = ? LIMIT 1",
            normalizedEmail,
        );
        if (existingByEmail) {
            if (
                existingByEmail.oauth_provider &&
                existingByEmail.oauth_sub &&
                (existingByEmail.oauth_provider !== profile.provider || existingByEmail.oauth_sub !== normalizedSubject)
            ) {
                throw new Error("이미 다른 소셜 계정과 연결된 이메일이에요.");
            }
            await tx.runAsync(
                `UPDATE users
				SET oauth_provider = ?, oauth_sub = ?, display_name = COALESCE(display_name, ?), updated_at = CURRENT_TIMESTAMP
				WHERE id = ?`,
                profile.provider,
                normalizedSubject,
                normalizedDisplayName,
                existingByEmail.id,
            );
            const refreshed = await tx.getFirstAsync<UserRow>(
                "SELECT id, username, display_name, phone_number, password_hash, oauth_provider, oauth_sub FROM users WHERE id = ? LIMIT 1",
                existingByEmail.id,
            );
            if (!refreshed) {
                throw new Error("소셜 계정 정보를 불러오지 못했어요.");
            }
            return mapUserRow(refreshed, normalizedDisplayName);
        }

        await tx.runAsync(
            `INSERT INTO users (username, display_name, phone_number, password_hash, oauth_provider, oauth_sub)
			VALUES (?, ?, NULL, NULL, ?, ?)`,
            normalizedEmail,
            normalizedDisplayName,
            profile.provider,
            normalizedSubject,
        );
        const created = await tx.getFirstAsync<UserRow>(
            "SELECT id, username, display_name, phone_number, password_hash, oauth_provider, oauth_sub FROM users WHERE username = ? LIMIT 1",
            normalizedEmail,
        );
        if (!created) {
            throw new Error("소셜 계정을 생성하지 못했어요.");
        }
        return mapUserRow(created, normalizedDisplayName);
    });
}

async function upsertOAuthUserWeb(profile: OAuthProfilePayload): Promise<UserRecord> {
    const normalizedEmail = profile.email.trim().toLowerCase();
    const normalizedSubject = profile.subject.trim();
    if (!normalizedEmail || !normalizedSubject) {
        throw new Error("소셜 계정 정보를 확인하지 못했어요.");
    }

    const normalizedDisplayName = resolveOAuthDisplayName(normalizedEmail, profile.displayName);
    const state = readWebState();
    const existingBySub = state.users.find(
        (user) => user.oauth_provider === profile.provider && user.oauth_sub === normalizedSubject,
    );
    const existingByEmail = state.users.find((user) => user.username === normalizedEmail);
    let nextUsers = state.users;
    let target: UserRow | null = null;

    if (existingBySub) {
        target = {
            ...existingBySub,
            username: normalizedEmail,
            display_name: existingBySub.display_name ?? normalizedDisplayName,
        };
        nextUsers = state.users.map((user) => (user.id === existingBySub.id ? target! : user));
    } else if (existingByEmail) {
        if (
            existingByEmail.oauth_provider &&
            existingByEmail.oauth_sub &&
            (existingByEmail.oauth_provider !== profile.provider || existingByEmail.oauth_sub !== normalizedSubject)
        ) {
            throw new Error("이미 다른 소셜 계정과 연결된 이메일이에요.");
        }
        target = {
            ...existingByEmail,
            oauth_provider: profile.provider,
            oauth_sub: normalizedSubject,
            display_name: existingByEmail.display_name ?? normalizedDisplayName,
        };
        nextUsers = state.users.map((user) => (user.id === existingByEmail.id ? target! : user));
    } else {
        target = {
            id: generateWebUserId(state.users),
            username: normalizedEmail,
            display_name: normalizedDisplayName,
            phone_number: null,
            password_hash: null,
            oauth_provider: profile.provider,
            oauth_sub: normalizedSubject,
        };
        nextUsers = [...state.users, target];
    }

    writeWebState({ ...state, users: nextUsers });
    return mapUserRow(target, normalizedDisplayName);
}

async function sendEmailVerificationCodeNative(email: string): Promise<EmailVerificationPayload> {
    const db = await getDatabase();
    const code = await generateVerificationCode();
    const expiresAt = getVerificationExpiryTimestamp();
    await db.runAsync(
        `INSERT INTO email_verifications (email, code, expires_at, verified_at, updated_at)
		VALUES (?, ?, ?, NULL, CURRENT_TIMESTAMP)
		ON CONFLICT(email) DO UPDATE SET code = excluded.code, expires_at = excluded.expires_at, verified_at = NULL, updated_at = CURRENT_TIMESTAMP`,
        [email, code, expiresAt],
    );
    return { code, expiresAt };
}

async function sendEmailVerificationCodeWeb(email: string): Promise<EmailVerificationPayload> {
    const state = readWebState();
    const code = await generateVerificationCode();
    const expiresAt = getVerificationExpiryTimestamp();
    const timestamp = new Date().toISOString();
    const nextState: WebDatabaseState = {
        ...state,
        emailVerifications: {
            ...state.emailVerifications,
            [email]: {
                code,
                expires_at: expiresAt,
                verified_at: null,
                updated_at: timestamp,
            },
        },
    };
    writeWebState(nextState);
    return { code, expiresAt };
}

async function deleteUserAccountNative(userId: number, username: string) {
    const db = await getDatabase();
    await db.runAsync("DELETE FROM favorites WHERE user_id = ?", [userId]);
    await db.runAsync("DELETE FROM users WHERE id = ?", [userId]);
    await db.runAsync("DELETE FROM session", []);
    await db.runAsync("DELETE FROM auto_login", []);
    await db.runAsync("DELETE FROM app_preferences", []);
    await db.runAsync("DELETE FROM email_verifications WHERE email = ?", [username]);
}

function deleteUserAccountWeb(userId: number, username: string) {
    const state = readWebState();
    const normalizedUsername = username.trim().toLowerCase();
    const { [normalizedUsername]: _removed, ...restVerifications } = state.emailVerifications;
    const nextState: WebDatabaseState = {
        ...state,
        users: state.users.filter((user) => user.id !== userId),
        favorites: state.favorites.filter((favorite) => favorite.user_id !== userId),
        session: null,
        autoLogin: null,
        preferences: {},
        emailVerifications: restVerifications,
    };
    writeWebState(nextState);
}

async function getEmailVerificationNative(email: string): Promise<EmailVerificationRow | null> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<EmailVerificationRow>(
        "SELECT email, code, expires_at, verified_at FROM email_verifications WHERE email = ? LIMIT 1",
        [email],
    );
    return rows.length > 0 ? rows[0] : null;
}

function getEmailVerificationWeb(email: string): WebEmailVerificationState | null {
    const state = readWebState();
    return state.emailVerifications[email] ?? null;
}

async function verifyEmailVerificationCodeNative(email: string, code: string): Promise<boolean> {
    const record = await getEmailVerificationNative(email);
    if (!record) {
        return false;
    }
    if (record.code !== code || isVerificationExpired(record.expires_at)) {
        return false;
    }
    const db = await getDatabase();
    await db.runAsync(
        "UPDATE email_verifications SET verified_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE email = ?",
        [email],
    );
    return true;
}

async function verifyEmailVerificationCodeWeb(email: string, code: string): Promise<boolean> {
    const state = readWebState();
    const record = state.emailVerifications[email];
    if (!record) {
        return false;
    }
    if (record.code !== code || isVerificationExpired(record.expires_at)) {
        return false;
    }
    const timestamp = new Date().toISOString();
    const nextState: WebDatabaseState = {
        ...state,
        emailVerifications: {
            ...state.emailVerifications,
            [email]: {
                ...record,
                verified_at: timestamp,
                updated_at: timestamp,
            },
        },
    };
    writeWebState(nextState);
    return true;
}

async function isEmailVerificationVerifiedNative(email: string): Promise<boolean> {
    const record = await getEmailVerificationNative(email);
    return Boolean(record?.verified_at && !isVerificationExpired(record.expires_at));
}

async function isEmailVerificationVerifiedWeb(email: string): Promise<boolean> {
    const record = getEmailVerificationWeb(email);
    return Boolean(record?.verified_at && !isVerificationExpired(record.expires_at));
}

async function clearEmailVerificationNative(email: string) {
    const db = await getDatabase();
    await db.runAsync("DELETE FROM email_verifications WHERE email = ?", [email]);
}

function clearEmailVerificationWeb(email: string) {
    const state = readWebState();
    if (!state.emailVerifications[email]) {
        return;
    }
    const { [email]: _removed, ...rest } = state.emailVerifications;
    const nextState: WebDatabaseState = {
        ...state,
        emailVerifications: rest,
    };
    writeWebState(nextState);
}

async function isDisplayNameTakenNative(displayName: string, excludeUserId?: number) {
    const db = await getDatabase();
    const normalizedDisplayName = displayName.trim();
    if (!normalizedDisplayName) {
        return false;
    }
    const params = excludeUserId != null ? [normalizedDisplayName, excludeUserId] : [normalizedDisplayName];
    const query =
        excludeUserId != null
            ? "SELECT 1 FROM users WHERE display_name IS NOT NULL AND LOWER(display_name) = LOWER(?) AND id != ? LIMIT 1"
            : "SELECT 1 FROM users WHERE display_name IS NOT NULL AND LOWER(display_name) = LOWER(?) LIMIT 1";
    const rows = await db.getAllAsync<{ exists: number }>(query, params);
    return rows.length > 0;
}

function isDisplayNameTakenWeb(displayName: string, excludeUserId?: number) {
    const normalizedDisplayName = displayName.trim().toLowerCase();
    if (!normalizedDisplayName) {
        return false;
    }
    const state = readWebState();
    return state.users.some((user) => {
        if (!user.display_name) {
            return false;
        }
        if (excludeUserId != null && user.id === excludeUserId) {
            return false;
        }
        return user.display_name.trim().toLowerCase() === normalizedDisplayName;
    });
}

async function updateUserDisplayNameNative(userId: number, displayName: string | null) {
    const db = await getDatabase();
    await db.runAsync("UPDATE users SET display_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [
        displayName,
        userId,
    ]);

    const updated = await db.getAllAsync<UserRow>(
        "SELECT id, username, display_name, phone_number, password_hash, oauth_provider, oauth_sub FROM users WHERE id = ? LIMIT 1",
        [userId],
    );
    if (updated.length === 0) {
        throw new Error("사용자 정보를 찾을 수 없어요.");
    }
    return mapUserRow(updated[0]);
}

async function updateUserDisplayNameWeb(userId: number, displayName: string | null) {
    const state = readWebState();
    const existing = state.users.find((user) => user.id === userId);
    if (!existing) {
        throw new Error("사용자 정보를 찾을 수 없어요.");
    }
    const updated: UserRow = {
        ...existing,
        display_name: displayName ?? null,
    };
    const nextState: WebDatabaseState = {
        ...state,
        users: state.users.map((user) => (user.id === userId ? updated : user)),
    };
    writeWebState(nextState);
    return mapUserRow(updated);
}

async function updateUserPasswordNative(userId: number, password: string) {
    const db = await getDatabase();
    const passwordHash = await hashPassword(password);
    await db.runAsync("UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [
        passwordHash,
        userId,
    ]);
    const rows = await db.getAllAsync<UserRow>(
        "SELECT id, username, display_name, phone_number, password_hash, oauth_provider, oauth_sub FROM users WHERE id = ? LIMIT 1",
        [userId],
    );
    if (rows.length === 0) {
        throw new Error("사용자 정보를 찾을 수 없어요.");
    }
    return { user: mapUserRow(rows[0]), passwordHash };
}

async function updateUserPasswordWeb(userId: number, password: string) {
    const state = readWebState();
    const existing = state.users.find((user) => user.id === userId);
    if (!existing) {
        throw new Error("사용자 정보를 찾을 수 없어요.");
    }
    const passwordHash = await hashPassword(password);
    const updated: UserRow = {
        ...existing,
        password_hash: passwordHash,
    };
    const nextState: WebDatabaseState = {
        ...state,
        users: state.users.map((user) => (user.id === userId ? updated : user)),
    };
    writeWebState(nextState);
    return { user: mapUserRow(updated), passwordHash };
}

async function getFavoritesByUserNative(userId: number): Promise<FavoriteWordEntry[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ data: string }>(
        "SELECT data FROM favorites WHERE user_id = ? ORDER BY created_at DESC",
        [userId],
    );

    return rows
        .map((row) => {
            try {
                const parsed = JSON.parse(row.data) as unknown;
                return normalizeFavoriteEntry(parsed);
            } catch (error) {
                console.warn("즐겨찾기 데이터를 읽는 중 오류가 발생했어요.", error);
                return null;
            }
        })
        .filter((item): item is FavoriteWordEntry => item !== null);
}

async function getFavoritesByUserWeb(userId: number): Promise<FavoriteWordEntry[]> {
    const state = readWebState();
    return state.favorites
        .filter((favorite) => favorite.user_id === userId)
        .map((favorite) => {
            try {
                const parsed = JSON.parse(favorite.data) as unknown;
                return normalizeFavoriteEntry(parsed);
            } catch (error) {
                console.warn("즐겨찾기 데이터를 읽는 중 오류가 발생했어요.", error);
                return null;
            }
        })
        .filter((item): item is FavoriteWordEntry => item !== null);
}

async function upsertFavoriteForUserNative(userId: number, entry: FavoriteWordEntry) {
    const db = await getDatabase();
    const payload: FavoriteWordEntry = {
        ...entry,
        updatedAt: new Date().toISOString(),
    };
    await db.runAsync(
        `
			INSERT INTO favorites (user_id, word, data)
			VALUES (?, ?, ?)
			ON CONFLICT(user_id, word)
			DO UPDATE SET data = excluded.data, updated_at = CURRENT_TIMESTAMP
		`,
        [userId, entry.word.word, JSON.stringify(payload)],
    );
}

async function upsertFavoriteForUserWeb(userId: number, entry: FavoriteWordEntry) {
    const state = readWebState();
    const payload: FavoriteWordEntry = {
        ...entry,
        updatedAt: new Date().toISOString(),
    };
    const serialized = JSON.stringify(payload);
    const now = new Date().toISOString();
    const existingIndex = state.favorites.findIndex(
        (favorite) => favorite.user_id === userId && favorite.word === entry.word.word,
    );

    let nextFavorites: WebFavoriteRow[];
    if (existingIndex >= 0) {
        nextFavorites = state.favorites.map((favorite, index) =>
            index === existingIndex
                ? {
                      ...favorite,
                      data: serialized,
                      updated_at: now,
                  }
                : favorite,
        );
    } else {
        const newFavorite: WebFavoriteRow = {
            id: generateWebFavoriteId(state.favorites),
            user_id: userId,
            word: entry.word.word,
            data: serialized,
            created_at: now,
            updated_at: now,
        };
        nextFavorites = [newFavorite, ...state.favorites];
    }
    writeWebState({ ...state, favorites: nextFavorites });
}

async function removeFavoriteForUserNative(userId: number, word: string) {
    const db = await getDatabase();
    await db.runAsync("DELETE FROM favorites WHERE user_id = ? AND word = ?", [userId, word]);
}

async function removeFavoriteForUserWeb(userId: number, word: string) {
    const state = readWebState();
    const nextFavorites = state.favorites.filter(
        (favorite) => !(favorite.user_id === userId && favorite.word === word),
    );
    if (nextFavorites.length === state.favorites.length) {
        return;
    }
    writeWebState({ ...state, favorites: nextFavorites });
}

async function setGuestSessionNative() {
    const db = await getDatabase();
    await db.runAsync(
        `
			INSERT INTO session (id, is_guest, user_id, updated_at)
			VALUES (1, 1, NULL, CURRENT_TIMESTAMP)
			ON CONFLICT(id)
			DO UPDATE SET is_guest = excluded.is_guest, user_id = excluded.user_id, updated_at = CURRENT_TIMESTAMP
		`,
        [],
    );
}

async function setGuestSessionWeb() {
    const state = readWebState();
    const nextState: WebDatabaseState = {
        ...state,
        session: {
            user_id: null,
            is_guest: 1,
            updated_at: new Date().toISOString(),
        },
    };
    writeWebState(nextState);
}

async function saveAutoLoginCredentialsNative(username: string, passwordHash: string) {
    const payload = JSON.stringify({ username, passwordHash, updatedAt: new Date().toISOString() });
    try {
        await SecureStore.setItemAsync("autoLoginCredentials", payload, {
            keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
        });
    } catch (error) {
        console.warn("보안 저장소에 자동 로그인을 저장하는 중 문제가 발생했어요.", error);
    }
}

async function saveAutoLoginCredentialsWeb(username: string, passwordHash: string) {
    void username;
    void passwordHash;
    // Avoid persisting password hashes in web storage.
}

async function clearAutoLoginCredentialsNative() {
    try {
        await SecureStore.deleteItemAsync("autoLoginCredentials");
    } catch (error) {
        console.warn("보안 저장소의 자동 로그인을 삭제하는 중 문제가 발생했어요.", error);
    }
    const db = await getDatabase();
    await db.runAsync("DELETE FROM auto_login WHERE id = 1");
}

async function clearAutoLoginCredentialsWeb() {
    const state = readWebState();
    if (!state.autoLogin) {
        return;
    }
    writeWebState({ ...state, autoLogin: null });
}

async function getAutoLoginCredentialsNative(): Promise<{ username: string; passwordHash: string } | null> {
    try {
        const stored = await SecureStore.getItemAsync("autoLoginCredentials");
        if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed?.username && parsed?.passwordHash) {
                return {
                    username: String(parsed.username),
                    passwordHash: String(parsed.passwordHash),
                };
            }
        }
    } catch (error) {
        console.warn("보안 저장소의 자동 로그인 정보를 불러오지 못했어요.", error);
    }
    return null;
}

async function getAutoLoginCredentialsWeb(): Promise<{ username: string; passwordHash: string } | null> {
    return null;
}

async function getHasSeenAppHelpNative(): Promise<boolean> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ value: string }>("SELECT value FROM app_preferences WHERE key = ? LIMIT 1", [
        APP_HELP_KEY,
    ]);
    if (rows.length === 0) {
        return false;
    }
    return rows[0]?.value === "true";
}

async function markAppHelpSeenNative() {
    const db = await getDatabase();
    await db.runAsync(
        `
			INSERT INTO app_preferences (key, value, updated_at)
			VALUES (?, ?, CURRENT_TIMESTAMP)
			ON CONFLICT(key)
			DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
		`,
        [APP_HELP_KEY, "true"],
    );
}

async function getHasSeenAppHelpWeb(): Promise<boolean> {
    const state = readWebState();
    return state.preferences[APP_HELP_KEY] === "true";
}

async function markAppHelpSeenWeb() {
    const state = readWebState();
    const nextState: WebDatabaseState = {
        ...state,
        preferences: {
            ...state.preferences,
            [APP_HELP_KEY]: "true",
        },
    };
    writeWebState(nextState);
}

async function getSearchHistoryNative(): Promise<SearchHistoryEntry[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ value: string }>("SELECT value FROM app_preferences WHERE key = ? LIMIT 1", [
        SEARCH_HISTORY_KEY,
    ]);
    return normalizeSearchHistoryPayload(rows[0]?.value ?? null);
}

async function saveSearchHistoryNative(entries: SearchHistoryEntry[]) {
    const db = await getDatabase();
    await db.runAsync(
        `
			INSERT INTO app_preferences (key, value, updated_at)
			VALUES (?, ?, CURRENT_TIMESTAMP)
			ON CONFLICT(key)
			DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
		`,
        [SEARCH_HISTORY_KEY, serializeSearchHistoryPayload(entries)],
    );
}

async function clearSearchHistoryNative() {
    const db = await getDatabase();
    await db.runAsync("DELETE FROM app_preferences WHERE key = ?", [SEARCH_HISTORY_KEY]);
}

async function getSearchHistoryWeb(): Promise<SearchHistoryEntry[]> {
    const state = readWebState();
    return normalizeSearchHistoryPayload(state.preferences[SEARCH_HISTORY_KEY]);
}

async function saveSearchHistoryWeb(entries: SearchHistoryEntry[]) {
    const state = readWebState();
    const nextState: WebDatabaseState = {
        ...state,
        preferences: {
            ...state.preferences,
            [SEARCH_HISTORY_KEY]: serializeSearchHistoryPayload(entries),
        },
    };
    writeWebState(nextState);
}

async function clearSearchHistoryWeb() {
    const state = readWebState();
    if (!state.preferences[SEARCH_HISTORY_KEY]) {
        return;
    }
    const nextPreferences = { ...state.preferences };
    delete nextPreferences[SEARCH_HISTORY_KEY];
    writeWebState({
        ...state,
        preferences: nextPreferences,
    });
}

async function getPreferenceValueNative(key: string): Promise<string | null> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ value: string }>("SELECT value FROM app_preferences WHERE key = ? LIMIT 1", [
        key,
    ]);
    return rows[0]?.value ?? null;
}

async function setPreferenceValueNative(key: string, value: string) {
    const db = await getDatabase();
    await db.runAsync(
        `
			INSERT INTO app_preferences (key, value, updated_at)
			VALUES (?, ?, CURRENT_TIMESTAMP)
			ON CONFLICT(key)
			DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
		`,
        [key, value],
    );
}

async function getPreferenceValueWeb(key: string): Promise<string | null> {
    const state = readWebState();
    return typeof state.preferences[key] === "string" ? state.preferences[key] : null;
}

async function setPreferenceValueWeb(key: string, value: string) {
    const state = readWebState();
    const nextState: WebDatabaseState = {
        ...state,
        preferences: {
            ...state.preferences,
            [key]: value,
        },
    };
    writeWebState(nextState);
}

async function setUserSessionNative(userId: number) {
    const db = await getDatabase();
    await db.runAsync(
        `
			INSERT INTO session (id, is_guest, user_id, updated_at)
			VALUES (1, 0, ?, CURRENT_TIMESTAMP)
			ON CONFLICT(id)
			DO UPDATE SET is_guest = excluded.is_guest, user_id = excluded.user_id, updated_at = CURRENT_TIMESTAMP
		`,
        [userId],
    );
}

async function setUserSessionWeb(userId: number) {
    const state = readWebState();
    const nextState: WebDatabaseState = {
        ...state,
        session: {
            user_id: userId,
            is_guest: 0,
            updated_at: new Date().toISOString(),
        },
    };
    writeWebState(nextState);
}

async function clearSessionNative() {
    const db = await getDatabase();
    await db.runAsync("DELETE FROM session WHERE id = 1", []);
}

async function clearSessionWebInternal() {
    const state = readWebState();
    if (!state.session) {
        return;
    }
    writeWebState({ ...state, session: null });
}

async function getActiveSessionNative(): Promise<{ isGuest: boolean; user: UserRecord | null } | null> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<SessionRow>("SELECT user_id, is_guest FROM session WHERE id = 1 LIMIT 1");

    if (rows.length === 0) {
        return null;
    }

    const [session] = rows;
    if (session.is_guest) {
        return { isGuest: true, user: null };
    }

    if (session.user_id == null) {
        await clearSessionNative();
        return null;
    }

    const userRows = await db.getAllAsync<UserRow>(
        "SELECT id, username, display_name, phone_number, password_hash, oauth_provider, oauth_sub FROM users WHERE id = ? LIMIT 1",
        [session.user_id],
    );

    if (userRows.length === 0) {
        await clearSessionNative();
        return null;
    }

    return { isGuest: false, user: mapUserRow(userRows[0]) };
}

async function getActiveSessionWeb(): Promise<{ isGuest: boolean; user: UserRecord | null } | null> {
    const state = readWebState();
    const session = state.session;
    if (!session) {
        return null;
    }

    if (session.is_guest) {
        return { isGuest: true, user: null };
    }

    if (session.user_id == null) {
        await clearSessionWebInternal();
        return null;
    }

    const userRow = state.users.find((user) => user.id === session.user_id);
    if (!userRow) {
        await clearSessionWebInternal();
        return null;
    }

    return { isGuest: false, user: mapUserRow(userRow) };
}

export async function initializeDatabase() {
    if (isWeb) {
        await initializeDatabaseWeb();
        return;
    }
    await initializeDatabaseNative();
}

export async function findUserByUsername(username: string): Promise<UserWithPasswordRecord | null> {
    const normalizedUsername = username.trim();
    if (!normalizedUsername) {
        throw new Error("이메일 주소를 입력해주세요.");
    }

    if (isWeb) {
        return await findUserByUsernameWeb(normalizedUsername);
    }
    return await findUserByUsernameNative(normalizedUsername);
}

export async function createUser(
    username: string,
    password: string,
    displayName?: string,
    phoneNumber?: string | null,
) {
    const normalizedUsername = username.trim();
    if (!normalizedUsername) {
        throw new Error("이메일 주소를 입력해주세요.");
    }
    const normalizedDisplayName = displayName ?? normalizedUsername;
    const normalizedPhoneNumber = phoneNumber?.trim() || null;

    if (isWeb) {
        return await createUserWeb(normalizedUsername, password, normalizedDisplayName, normalizedPhoneNumber);
    }
    return await createUserNative(normalizedUsername, password, normalizedDisplayName, normalizedPhoneNumber);
}

export async function upsertOAuthUser(profile: OAuthProfilePayload) {
    if (isWeb) {
        return await upsertOAuthUserWeb(profile);
    }
    return await upsertOAuthUserNative(profile);
}

export async function sendEmailVerificationCode(email: string): Promise<EmailVerificationPayload> {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
        throw new Error("이메일 주소를 입력해주세요.");
    }
    if (isWeb) {
        return await sendEmailVerificationCodeWeb(normalizedEmail);
    }
    return await sendEmailVerificationCodeNative(normalizedEmail);
}

export async function verifyEmailVerificationCode(email: string, code: string): Promise<boolean> {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedCode = code.trim();
    if (!normalizedEmail || !normalizedCode) {
        return false;
    }
    if (isWeb) {
        return await verifyEmailVerificationCodeWeb(normalizedEmail, normalizedCode);
    }
    return await verifyEmailVerificationCodeNative(normalizedEmail, normalizedCode);
}

export async function isEmailVerificationVerified(email: string): Promise<boolean> {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
        return false;
    }
    if (isWeb) {
        return await isEmailVerificationVerifiedWeb(normalizedEmail);
    }
    return await isEmailVerificationVerifiedNative(normalizedEmail);
}

export async function clearEmailVerification(email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
        return;
    }
    if (isWeb) {
        clearEmailVerificationWeb(normalizedEmail);
        return;
    }
    await clearEmailVerificationNative(normalizedEmail);
}

export async function deleteUserAccount(userId: number, username: string) {
    const normalizedUsername = username.trim().toLowerCase();
    if (isWeb) {
        deleteUserAccountWeb(userId, normalizedUsername);
        return;
    }
    await deleteUserAccountNative(userId, normalizedUsername);
}

export async function updateUserDisplayName(userId: number, displayName: string | null) {
    if (isWeb) {
        return await updateUserDisplayNameWeb(userId, displayName);
    }
    return await updateUserDisplayNameNative(userId, displayName);
}

export async function updateUserPassword(userId: number, password: string) {
    if (isWeb) {
        return await updateUserPasswordWeb(userId, password);
    }
    return await updateUserPasswordNative(userId, password);
}

export async function isDisplayNameTaken(displayName: string, excludeUserId?: number) {
    const normalizedDisplayName = displayName.trim();
    if (!normalizedDisplayName) {
        return false;
    }
    if (isWeb) {
        return isDisplayNameTakenWeb(normalizedDisplayName, excludeUserId);
    }
    return await isDisplayNameTakenNative(normalizedDisplayName, excludeUserId);
}

export async function getFavoritesByUser(userId: number): Promise<FavoriteWordEntry[]> {
    if (isWeb) {
        return await getFavoritesByUserWeb(userId);
    }
    return await getFavoritesByUserNative(userId);
}

export async function upsertFavoriteForUser(userId: number, entry: FavoriteWordEntry) {
    if (isWeb) {
        await upsertFavoriteForUserWeb(userId, entry);
        return;
    }
    await upsertFavoriteForUserNative(userId, entry);
}

export async function removeFavoriteForUser(userId: number, word: string) {
    if (isWeb) {
        await removeFavoriteForUserWeb(userId, word);
        return;
    }
    await removeFavoriteForUserNative(userId, word);
}

export async function setGuestSession() {
    if (isWeb) {
        await setGuestSessionWeb();
        return;
    }
    await setGuestSessionNative();
}

export async function setUserSession(userId: number) {
    if (isWeb) {
        await setUserSessionWeb(userId);
        return;
    }
    await setUserSessionNative(userId);
}

export async function clearSession() {
    if (isWeb) {
        await clearSessionWebInternal();
        return;
    }
    await clearSessionNative();
}

export async function getActiveSession(): Promise<{ isGuest: boolean; user: UserRecord | null } | null> {
    if (isWeb) {
        return await getActiveSessionWeb();
    }
    return await getActiveSessionNative();
}

export async function saveAutoLoginCredentials(username: string, passwordHash: string) {
    if (isWeb) {
        await saveAutoLoginCredentialsWeb(username, passwordHash);
        return;
    }
    await saveAutoLoginCredentialsNative(username, passwordHash);
}

export async function clearAutoLoginCredentials() {
    if (isWeb) {
        await clearAutoLoginCredentialsWeb();
        return;
    }
    await clearAutoLoginCredentialsNative();
}

export async function getAutoLoginCredentials() {
    if (isWeb) {
        return await getAutoLoginCredentialsWeb();
    }
    return await getAutoLoginCredentialsNative();
}

export async function hasSeenAppHelp() {
    if (isWeb) {
        return await getHasSeenAppHelpWeb();
    }
    return await getHasSeenAppHelpNative();
}

export async function markAppHelpSeen() {
    if (isWeb) {
        await markAppHelpSeenWeb();
        return;
    }
    await markAppHelpSeenNative();
}

export async function getPreferenceValue(key: string) {
    if (isWeb) {
        return await getPreferenceValueWeb(key);
    }
    return await getPreferenceValueNative(key);
}

export async function setPreferenceValue(key: string, value: string) {
    if (isWeb) {
        await setPreferenceValueWeb(key, value);
        return;
    }
    await setPreferenceValueNative(key, value);
}

export async function getSearchHistoryEntries() {
    if (isWeb) {
        return await getSearchHistoryWeb();
    }
    return await getSearchHistoryNative();
}

export async function saveSearchHistoryEntries(entries: SearchHistoryEntry[]) {
    if (isWeb) {
        await saveSearchHistoryWeb(entries);
        return;
    }
    await saveSearchHistoryNative(entries);
}

export async function clearSearchHistoryEntries() {
    if (isWeb) {
        await clearSearchHistoryWeb();
        return;
    }
    await clearSearchHistoryNative();
}
