import {
    AuthError,
    confirmPasswordReset,
    createUserWithEmailAndPassword,
    deleteUser,
    onAuthStateChanged,
    sendPasswordResetEmail,
    signInWithEmailAndPassword,
    signOut,
    type Unsubscribe,
    updatePassword,
    updateProfile,
    User,
    verifyPasswordResetCode,
} from "firebase/auth";

import { getFirebaseAuth } from "@/services/auth/firebaseClient";

export type FirebaseSessionUser = {
    uid: string;
    email: string | null;
    displayName: string | null;
    emailVerified: boolean;
    isAnonymous: boolean;
    providerIds: string[];
};

function mapUser(user: User): FirebaseSessionUser {
    const providerIds = user.providerData
        .map((provider) => provider.providerId)
        .filter((providerId): providerId is string => typeof providerId === "string" && providerId.length > 0);

    return {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        emailVerified: user.emailVerified,
        isAnonymous: user.isAnonymous,
        providerIds,
    };
}

function normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
}

function normalizePasswordResetCode(value: string): string {
    const trimmed = value.trim();
    if (!trimmed) {
        return "";
    }

    try {
        const url = new URL(trimmed);
        const fromQuery = url.searchParams.get("oobCode");
        if (fromQuery) {
            return fromQuery.trim();
        }
    } catch {
        // Continue with regex fallback.
    }

    const match = trimmed.match(/[?&]oobCode=([^&#\s]+)/i);
    if (match?.[1]) {
        try {
            return decodeURIComponent(match[1]).trim();
        } catch {
            return match[1].trim();
        }
    }

    return trimmed;
}

export function getFirebaseAuthErrorCode(error: unknown): string | null {
    if (!error || typeof error !== "object") {
        return null;
    }
    const code = (error as AuthError).code;
    return typeof code === "string" ? code : null;
}

export function isFirebaseAuthError(error: unknown, ...codes: string[]): boolean {
    const code = getFirebaseAuthErrorCode(error);
    return Boolean(code && codes.includes(code));
}

export function getCurrentFirebaseSessionUser(): FirebaseSessionUser | null {
    const auth = getFirebaseAuth();
    return auth.currentUser ? mapUser(auth.currentUser) : null;
}

export async function signInWithEmail(email: string, password: string): Promise<FirebaseSessionUser> {
    const auth = getFirebaseAuth();
    const credential = await signInWithEmailAndPassword(auth, normalizeEmail(email), password);
    return mapUser(credential.user);
}

export async function signUpWithEmail(
    email: string,
    password: string,
    options?: {
        displayName?: string | null;
    },
): Promise<FirebaseSessionUser> {
    const auth = getFirebaseAuth();
    const credential = await createUserWithEmailAndPassword(auth, normalizeEmail(email), password);
    const displayName = options?.displayName?.trim() || null;
    if (displayName) {
        await updateProfile(credential.user, { displayName });
    }
    return mapUser(credential.user);
}

export async function requestPasswordReset(email: string): Promise<{ email: string; expiresAt: string }> {
    const auth = getFirebaseAuth();
    const normalizedEmail = normalizeEmail(email);
    await sendPasswordResetEmail(auth, normalizedEmail);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    return {
        email: normalizedEmail,
        expiresAt,
    };
}

export async function confirmPasswordResetByCode(payload: {
    email: string;
    code: string;
    newPassword: string;
}): Promise<void> {
    const auth = getFirebaseAuth();
    const normalizedEmail = normalizeEmail(payload.email);
    const oobCode = normalizePasswordResetCode(payload.code);
    if (!oobCode) {
        throw new Error("재설정 코드를 입력해주세요.");
    }

    const resolvedEmail = normalizeEmail(await verifyPasswordResetCode(auth, oobCode));
    if (resolvedEmail !== normalizedEmail) {
        throw new Error("입력한 이메일과 재설정 코드가 일치하지 않아요.");
    }

    await confirmPasswordReset(auth, oobCode, payload.newPassword);
}

export async function logoutFirebaseUser(): Promise<void> {
    const auth = getFirebaseAuth();
    await signOut(auth);
}

export async function deleteFirebaseUserAccount(): Promise<void> {
    const auth = getFirebaseAuth();
    const currentUser = auth.currentUser;
    if (!currentUser) {
        throw new Error("로그인한 사용자를 찾을 수 없어요.");
    }
    await deleteUser(currentUser);
}

export async function updateFirebaseUserPassword(newPassword: string): Promise<void> {
    const auth = getFirebaseAuth();
    const currentUser = auth.currentUser;
    if (!currentUser) {
        throw new Error("로그인한 사용자를 찾을 수 없어요.");
    }
    await updatePassword(currentUser, newPassword);
}

export function subscribeFirebaseAuthState(listener: (user: FirebaseSessionUser | null) => void): Unsubscribe {
    const auth = getFirebaseAuth();
    return onAuthStateChanged(auth, (user) => {
        listener(user ? mapUser(user) : null);
    });
}
