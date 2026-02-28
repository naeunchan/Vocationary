import { Buffer } from "buffer";
import * as Crypto from "expo-crypto";
import { getRandomBytesAsync } from "expo-crypto";

import { createRestoreSuccess, type RestoreResult } from "@/services/backup/restoreResult";
import { validateBackupPayload } from "@/services/backup/validateBackupPayload";
import type { DictionaryMode } from "@/services/dictionary/types";
import type { FavoriteWordEntry } from "@/services/favorites/types";
import type { SearchHistoryEntry } from "@/services/searchHistory/types";
import { SEARCH_HISTORY_LIMIT } from "@/services/searchHistory/types";

const PASSWORD_HASH_PREFIX = "sha256.v1";
const LEGACY_PASSWORD_SALT = "vocachip::salt";
const EMAIL_VERIFICATION_EXPIRY_MS = 10 * 60 * 1000;
const SEARCH_HISTORY_KEY = "search.history";

type UserRow = {
    id: number;
    username: string;
    display_name: string | null;
    phone_number: string | null;
    password_hash: string | null;
    oauth_provider: string | null;
    oauth_sub: string | null;
};

type EmailVerificationPayload = {
    code: string;
    expiresAt: string;
};

export type EmailVerificationConsumeStatus = "verified" | "not_found" | "invalid_code" | "expired" | "already_used";
export type PasswordResetByEmailStatus = "success" | "email_not_found" | "invalid_code" | "expired" | "already_used";

export type UserRecord = {
    id: number;
    username: string;
    displayName: string | null;
    phoneNumber: string | null;
};

type UserWithPasswordRecord = UserRecord & {
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

type MemoryState = {
    users: UserRow[];
    favoritesByUser: Record<number, FavoriteWordEntry[]>;
    searchHistory: SearchHistoryEntry[];
    session: SessionState | null;
    autoLogin: AutoLoginState | null;
    preferences: Record<string, string>;
    emailVerifications: Record<string, EmailVerificationState>;
};

const memoryState: MemoryState = {
    users: [],
    favoritesByUser: {},
    searchHistory: [],
    session: null,
    autoLogin: null,
    preferences: {},
    emailVerifications: {},
};

let nextUserId = 1;

function mapUserRow(row: UserRow, fallbackDisplayName?: string): UserRecord {
    return {
        id: row.id,
        username: row.username,
        displayName: row.display_name ?? fallbackDisplayName ?? null,
        phoneNumber: row.phone_number ?? null,
    };
}

function mapUserRowWithPassword(row: UserRow, fallbackDisplayName?: string): UserWithPasswordRecord {
    return {
        ...mapUserRow(row, fallbackDisplayName),
        passwordHash: row.password_hash ?? null,
    };
}

function normalizeUsername(username: string): string {
    return username.trim().toLowerCase();
}

function normalizeNullableString(value: unknown): string | null {
    if (typeof value !== "string") {
        return null;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

function cloneFavoriteEntry(entry: FavoriteWordEntry): FavoriteWordEntry {
    return {
        ...entry,
        word: { ...entry.word },
    };
}

function cloneFavorites(entries: FavoriteWordEntry[]): FavoriteWordEntry[] {
    return entries.map(cloneFavoriteEntry);
}

function cloneSearchHistory(entries: SearchHistoryEntry[]): SearchHistoryEntry[] {
    return entries.map((entry) => ({ ...entry }));
}

function cloneUsers(users: UserRow[]): UserRow[] {
    return users.map((user) => ({ ...user }));
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

export type BackupPayload = {
    version: 1;
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

export async function exportBackup(): Promise<BackupPayload> {
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
    for (const user of userRows) {
        favorites[user.username] = cloneFavorites(memoryState.favoritesByUser[user.id] ?? []);
    }

    const storedHistory = memoryState.preferences[SEARCH_HISTORY_KEY]
        ? (() => {
              try {
                  const parsed = JSON.parse(memoryState.preferences[SEARCH_HISTORY_KEY]) as SearchHistoryEntry[];
                  return Array.isArray(parsed) ? cloneSearchHistory(parsed) : [];
              } catch {
                  return [];
              }
          })()
        : cloneSearchHistory(memoryState.searchHistory);

    return {
        version: 1,
        exportedAt: new Date().toISOString(),
        users,
        favorites,
        searchHistory: storedHistory,
    };
}

export async function importBackup(payload: BackupPayload): Promise<RestoreResult> {
    const validationResult = validateBackupPayload(payload);
    if (!validationResult.ok) {
        return validationResult;
    }

    const parsed = validationResult.parsed;
    const nextUsers: UserRow[] = [];
    const nextFavoritesByUser: Record<number, FavoriteWordEntry[]> = {};

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
    }

    memoryState.users = nextUsers;
    memoryState.favoritesByUser = nextFavoritesByUser;
    memoryState.session = null;
    memoryState.autoLogin = null;
    memoryState.searchHistory = cloneSearchHistory(parsed.searchHistory);
    memoryState.preferences[SEARCH_HISTORY_KEY] = JSON.stringify(parsed.searchHistory);
    nextUserId = localNextUserId;

    const totalFavorites = Object.values(nextFavoritesByUser).reduce((count, entries) => count + entries.length, 0);

    return createRestoreSuccess({
        users: nextUsers.length,
        favorites: totalFavorites,
        searchHistory: parsed.searchHistory.length,
    });
}

export async function initializeDatabase() {}

export async function findUserByUsername(username: string): Promise<UserWithPasswordRecord | null> {
    const normalizedUsername = normalizeUsername(username);
    if (!normalizedUsername) {
        throw new Error("이메일 주소를 입력해주세요.");
    }

    const found = memoryState.users.find((user) => user.username === normalizedUsername);
    return found ? mapUserRowWithPassword(found) : null;
}

export async function createUser(
    username: string,
    password: string,
    displayName?: string,
    phoneNumber?: string | null,
) {
    const normalizedUsername = normalizeUsername(username);
    if (!normalizedUsername) {
        throw new Error("이메일 주소를 입력해주세요.");
    }
    if (memoryState.users.some((user) => user.username === normalizedUsername)) {
        throw new Error("이미 사용 중인 이메일이에요. 다른 이메일을 사용해주세요.");
    }

    const normalizedDisplayName = (displayName ?? normalizedUsername).trim() || normalizedUsername;
    const normalizedPhoneNumber = phoneNumber?.trim() || null;
    const passwordHash = await hashPassword(password);

    const newUser: UserRow = {
        id: nextUserId,
        username: normalizedUsername,
        display_name: normalizedDisplayName,
        phone_number: normalizedPhoneNumber,
        password_hash: passwordHash,
        oauth_provider: null,
        oauth_sub: null,
    };
    nextUserId += 1;
    memoryState.users.push(newUser);
    memoryState.favoritesByUser[newUser.id] = [];

    return mapUserRow(newUser, normalizedDisplayName);
}

export async function upsertOAuthUser(profile: OAuthProfilePayload) {
    const normalizedEmail = normalizeUsername(profile.email);
    const normalizedSubject = profile.subject.trim();
    if (!normalizedEmail || !normalizedSubject) {
        throw new Error("소셜 계정 정보를 확인하지 못했어요.");
    }

    const normalizedDisplayName = profile.displayName?.trim() || normalizedEmail.split("@")[0] || normalizedEmail;
    const normalizedPhoneNumber = profile.phoneNumber?.trim() || null;

    const existingBySub = memoryState.users.find(
        (user) => user.oauth_provider === profile.provider && user.oauth_sub === normalizedSubject,
    );

    if (existingBySub) {
        existingBySub.username = normalizedEmail;
        existingBySub.display_name = existingBySub.display_name ?? normalizedDisplayName;
        existingBySub.phone_number = existingBySub.phone_number ?? normalizedPhoneNumber;
        return mapUserRow(existingBySub, normalizedDisplayName);
    }

    const existingByEmail = memoryState.users.find((user) => user.username === normalizedEmail);
    if (existingByEmail) {
        const isSameIdentity =
            existingByEmail.oauth_provider === profile.provider && existingByEmail.oauth_sub === normalizedSubject;
        if (existingByEmail.oauth_provider && existingByEmail.oauth_sub && !isSameIdentity) {
            throw new Error("이미 다른 소셜 계정과 연결된 이메일이에요.");
        }
        existingByEmail.oauth_provider = profile.provider;
        existingByEmail.oauth_sub = normalizedSubject;
        existingByEmail.display_name = existingByEmail.display_name ?? normalizedDisplayName;
        existingByEmail.phone_number = existingByEmail.phone_number ?? normalizedPhoneNumber;
        return mapUserRow(existingByEmail, normalizedDisplayName);
    }

    const created: UserRow = {
        id: nextUserId,
        username: normalizedEmail,
        display_name: normalizedDisplayName,
        phone_number: normalizedPhoneNumber,
        password_hash: null,
        oauth_provider: profile.provider,
        oauth_sub: normalizedSubject,
    };
    nextUserId += 1;
    memoryState.users.push(created);
    memoryState.favoritesByUser[created.id] = [];
    return mapUserRow(created, normalizedDisplayName);
}

export async function sendEmailVerificationCode(email: string): Promise<EmailVerificationPayload> {
    const normalizedEmail = normalizeUsername(email);
    if (!normalizedEmail) {
        throw new Error("이메일 주소를 입력해주세요.");
    }

    const code = await generateVerificationCode();
    const expiresAt = getVerificationExpiryTimestamp();
    memoryState.emailVerifications[normalizedEmail] = {
        code,
        expires_at: expiresAt,
        verified_at: null,
        updated_at: new Date().toISOString(),
    };

    return { code, expiresAt };
}

export async function verifyEmailVerificationCode(email: string, code: string): Promise<boolean> {
    const status = await consumeEmailVerificationCode(email, code);
    return status === "verified";
}

export async function consumeEmailVerificationCode(
    email: string,
    code: string,
): Promise<EmailVerificationConsumeStatus> {
    const normalizedEmail = normalizeUsername(email);
    const normalizedCode = code.trim();
    if (!normalizedEmail) {
        return "not_found";
    }
    if (!normalizedCode) {
        return "invalid_code";
    }

    const record = memoryState.emailVerifications[normalizedEmail];
    if (!record) {
        return "not_found";
    }
    if (record.verified_at) {
        return "already_used";
    }
    if (isVerificationExpired(record.expires_at)) {
        delete memoryState.emailVerifications[normalizedEmail];
        return "expired";
    }
    if (record.code !== normalizedCode) {
        return "invalid_code";
    }

    record.verified_at = new Date().toISOString();
    record.updated_at = new Date().toISOString();
    return "verified";
}

export async function isEmailVerificationVerified(email: string): Promise<boolean> {
    const normalizedEmail = normalizeUsername(email);
    if (!normalizedEmail) {
        return false;
    }

    const record = memoryState.emailVerifications[normalizedEmail];
    return Boolean(record?.verified_at && !isVerificationExpired(record.expires_at));
}

export async function clearEmailVerification(email: string) {
    const normalizedEmail = normalizeUsername(email);
    if (!normalizedEmail) {
        return;
    }
    delete memoryState.emailVerifications[normalizedEmail];
}

export async function deleteUserAccount(userId: number, username: string) {
    const normalizedUsername = normalizeUsername(username);
    memoryState.users = memoryState.users.filter((user) => user.id !== userId);
    delete memoryState.favoritesByUser[userId];
    memoryState.session = null;
    memoryState.autoLogin = null;
    memoryState.preferences = {};
    delete memoryState.emailVerifications[normalizedUsername];
}

export async function updateUserDisplayName(userId: number, displayName: string | null) {
    const target = memoryState.users.find((user) => user.id === userId);
    if (!target) {
        throw new Error("사용자 정보를 찾을 수 없어요.");
    }

    target.display_name = displayName ?? null;
    return mapUserRow(target);
}

export async function updateUserPassword(userId: number, password: string) {
    const target = memoryState.users.find((user) => user.id === userId);
    if (!target) {
        throw new Error("사용자 정보를 찾을 수 없어요.");
    }

    const passwordHash = await hashPassword(password);
    target.password_hash = passwordHash;

    return {
        user: mapUserRow(target),
        passwordHash,
    };
}

export async function resetPasswordWithEmailCode(
    email: string,
    code: string,
    password: string,
): Promise<PasswordResetByEmailStatus> {
    const normalizedEmail = normalizeUsername(email);
    const normalizedCode = code.trim();
    if (!normalizedEmail) {
        return "email_not_found";
    }
    if (!normalizedCode) {
        return "invalid_code";
    }

    const targetUser = await findUserByUsername(normalizedEmail);
    if (!targetUser || !targetUser.passwordHash) {
        return "email_not_found";
    }

    const verificationStatus = await consumeEmailVerificationCode(normalizedEmail, normalizedCode);
    if (verificationStatus === "expired") {
        return "expired";
    }
    if (verificationStatus === "already_used") {
        return "already_used";
    }
    if (verificationStatus !== "verified") {
        return "invalid_code";
    }

    await updateUserPassword(targetUser.id, password);
    return "success";
}

export async function isDisplayNameTaken(displayName: string, excludeUserId?: number) {
    const normalizedDisplayName = displayName.trim().toLowerCase();
    if (!normalizedDisplayName) {
        return false;
    }

    return memoryState.users.some((user) => {
        if (!user.display_name) {
            return false;
        }
        if (excludeUserId != null && user.id === excludeUserId) {
            return false;
        }
        return user.display_name.trim().toLowerCase() === normalizedDisplayName;
    });
}

export async function getFavoritesByUser(userId: number): Promise<FavoriteWordEntry[]> {
    return cloneFavorites(memoryState.favoritesByUser[userId] ?? []);
}

export async function upsertFavoriteForUser(userId: number, entry: FavoriteWordEntry) {
    const list = memoryState.favoritesByUser[userId] ?? [];
    const targetWord = entry.word.word;
    const next = list.filter((item) => item.word.word !== targetWord);
    next.unshift(cloneFavoriteEntry(entry));
    memoryState.favoritesByUser[userId] = next;
}

export async function removeFavoriteForUser(userId: number, word: string) {
    const list = memoryState.favoritesByUser[userId] ?? [];
    memoryState.favoritesByUser[userId] = list.filter((item) => item.word.word !== word);
}

export async function setGuestSession() {
    memoryState.session = {
        isGuest: true,
        userId: null,
    };
}

export async function setUserSession(userId: number) {
    memoryState.session = {
        isGuest: false,
        userId,
    };
}

export async function clearSession() {
    memoryState.session = null;
}

export async function getActiveSession(): Promise<{ isGuest: boolean; user: UserRecord | null } | null> {
    if (!memoryState.session) {
        return null;
    }

    if (memoryState.session.isGuest) {
        return { isGuest: true, user: null };
    }

    if (memoryState.session.userId == null) {
        memoryState.session = null;
        return null;
    }

    const userRow = memoryState.users.find((user) => user.id === memoryState.session?.userId);
    if (!userRow) {
        memoryState.session = null;
        return null;
    }

    return {
        isGuest: false,
        user: mapUserRow(userRow),
    };
}

export async function saveAutoLoginCredentials(username: string, passwordHash: string) {
    memoryState.autoLogin = {
        username: normalizeUsername(username),
        passwordHash,
    };
}

export async function clearAutoLoginCredentials() {
    memoryState.autoLogin = null;
}

export async function getAutoLoginCredentials() {
    return memoryState.autoLogin ? { ...memoryState.autoLogin } : null;
}

export async function getPreferenceValue(key: string) {
    return Object.prototype.hasOwnProperty.call(memoryState.preferences, key) ? memoryState.preferences[key] : null;
}

export async function setPreferenceValue(key: string, value: string) {
    memoryState.preferences[key] = value;
}

function normalizeSearchHistoryMode(mode: unknown): DictionaryMode {
    return mode === "en-en" ? "en-en" : "en-en";
}

export async function getSearchHistoryEntries() {
    const stored = memoryState.preferences[SEARCH_HISTORY_KEY];
    if (!stored) {
        return cloneSearchHistory(memoryState.searchHistory);
    }

    try {
        const parsed = JSON.parse(stored) as SearchHistoryEntry[];
        if (!Array.isArray(parsed)) {
            return [];
        }
        return parsed
            .filter((entry) => entry && typeof entry.term === "string")
            .map((entry) => ({
                term: entry.term,
                mode: normalizeSearchHistoryMode(entry.mode),
                searchedAt: typeof entry.searchedAt === "string" ? entry.searchedAt : new Date().toISOString(),
            }))
            .slice(0, SEARCH_HISTORY_LIMIT);
    } catch {
        return [];
    }
}

export async function saveSearchHistoryEntries(entries: SearchHistoryEntry[]) {
    const normalized = entries
        .filter((entry) => entry && typeof entry.term === "string")
        .slice(0, SEARCH_HISTORY_LIMIT)
        .map((entry) => ({
            term: entry.term,
            mode: normalizeSearchHistoryMode(entry.mode),
            searchedAt: typeof entry.searchedAt === "string" ? entry.searchedAt : new Date().toISOString(),
        }));

    memoryState.searchHistory = cloneSearchHistory(normalized);
    memoryState.preferences[SEARCH_HISTORY_KEY] = JSON.stringify(normalized);
}

export async function clearSearchHistoryEntries() {
    memoryState.searchHistory = [];
    delete memoryState.preferences[SEARCH_HISTORY_KEY];
}
