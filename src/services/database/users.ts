import { Buffer } from "buffer";
import * as Crypto from "expo-crypto";
import { getRandomBytesAsync } from "expo-crypto";

import { clearPreferenceValues } from "@/services/database/preferences";
import {
    allocateUserId,
    EMAIL_VERIFICATION_EXPIRY_MS,
    type EmailVerificationConsumeStatus,
    ensureStateLoaded,
    LEGACY_PASSWORD_SALT,
    mapUserRow,
    mapUserRowWithPassword,
    memoryState,
    normalizeUsername,
    type OAuthProfilePayload,
    PASSWORD_HASH_PREFIX,
    type PasswordResetByEmailStatus,
    persistState,
    type UserWithPasswordRecord,
} from "@/services/database/state";

type EmailVerificationPayload = {
    code: string;
    expiresAt: string;
};

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

export async function findUserByUsername(username: string): Promise<UserWithPasswordRecord | null> {
    await ensureStateLoaded();

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
    await ensureStateLoaded();

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

    const newUser = {
        id: allocateUserId(),
        username: normalizedUsername,
        display_name: normalizedDisplayName,
        phone_number: normalizedPhoneNumber,
        password_hash: passwordHash,
        oauth_provider: null,
        oauth_sub: null,
    };

    memoryState.users.push(newUser);
    memoryState.favoritesByUser[newUser.id] = [];
    await persistState();

    return mapUserRow(newUser, normalizedDisplayName);
}

export async function upsertOAuthUser(profile: OAuthProfilePayload) {
    await ensureStateLoaded();

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
        await persistState();
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
        await persistState();
        return mapUserRow(existingByEmail, normalizedDisplayName);
    }

    const created = {
        id: allocateUserId(),
        username: normalizedEmail,
        display_name: normalizedDisplayName,
        phone_number: normalizedPhoneNumber,
        password_hash: null,
        oauth_provider: profile.provider,
        oauth_sub: normalizedSubject,
    };

    memoryState.users.push(created);
    memoryState.favoritesByUser[created.id] = [];
    await persistState();
    return mapUserRow(created, normalizedDisplayName);
}

export async function sendEmailVerificationCode(email: string): Promise<EmailVerificationPayload> {
    await ensureStateLoaded();

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
    await persistState();

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
    await ensureStateLoaded();

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
        await persistState();
        return "expired";
    }
    if (record.code !== normalizedCode) {
        return "invalid_code";
    }

    record.verified_at = new Date().toISOString();
    record.updated_at = new Date().toISOString();
    await persistState();
    return "verified";
}

export async function isEmailVerificationVerified(email: string): Promise<boolean> {
    await ensureStateLoaded();

    const normalizedEmail = normalizeUsername(email);
    if (!normalizedEmail) {
        return false;
    }

    const record = memoryState.emailVerifications[normalizedEmail];
    return Boolean(record?.verified_at && !isVerificationExpired(record.expires_at));
}

export async function clearEmailVerification(email: string) {
    await ensureStateLoaded();

    const normalizedEmail = normalizeUsername(email);
    if (!normalizedEmail) {
        return;
    }
    delete memoryState.emailVerifications[normalizedEmail];
    await persistState();
}

export async function deleteUserAccount(userId: number, username: string) {
    await ensureStateLoaded();

    const normalizedUsername = normalizeUsername(username);
    memoryState.users = memoryState.users.filter((user) => user.id !== userId);
    delete memoryState.favoritesByUser[userId];
    memoryState.session = null;
    memoryState.autoLogin = null;
    clearPreferenceValues();
    delete memoryState.emailVerifications[normalizedUsername];
    await persistState();
}

export async function updateUserDisplayName(userId: number, displayName: string | null) {
    await ensureStateLoaded();

    const target = memoryState.users.find((user) => user.id === userId);
    if (!target) {
        throw new Error("사용자 정보를 찾을 수 없어요.");
    }

    target.display_name = displayName ?? null;
    await persistState();
    return mapUserRow(target);
}

export async function updateUserPassword(userId: number, password: string) {
    await ensureStateLoaded();

    const target = memoryState.users.find((user) => user.id === userId);
    if (!target) {
        throw new Error("사용자 정보를 찾을 수 없어요.");
    }

    const passwordHash = await hashPassword(password);
    target.password_hash = passwordHash;
    await persistState();

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
    await ensureStateLoaded();

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
