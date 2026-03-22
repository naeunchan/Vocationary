import { ensureStateLoaded, mapUserRow, memoryState, persistState, type UserRecord } from "@/services/database/state";

export async function setGuestSession() {
    await ensureStateLoaded();
    memoryState.session = {
        isGuest: true,
        userId: null,
    };
    await persistState();
}

export async function setUserSession(userId: number) {
    await ensureStateLoaded();
    memoryState.session = {
        isGuest: false,
        userId,
    };
    await persistState();
}

export async function clearSession() {
    await ensureStateLoaded();
    memoryState.session = null;
    await persistState();
}

export async function getActiveSession(): Promise<{ isGuest: boolean; user: UserRecord | null } | null> {
    await ensureStateLoaded();

    if (!memoryState.session) {
        return null;
    }

    if (memoryState.session.isGuest) {
        return { isGuest: true, user: null };
    }

    if (memoryState.session.userId == null) {
        memoryState.session = null;
        await persistState();
        return null;
    }

    const userRow = memoryState.users.find((user) => user.id === memoryState.session?.userId);
    if (!userRow) {
        memoryState.session = null;
        await persistState();
        return null;
    }

    return {
        isGuest: false,
        user: mapUserRow(userRow),
    };
}

export async function saveAutoLoginCredentials(username: string, passwordHash: string) {
    await ensureStateLoaded();
    memoryState.autoLogin = {
        username: username.trim().toLowerCase(),
        passwordHash,
    };
    await persistState();
}

export async function clearAutoLoginCredentials() {
    await ensureStateLoaded();
    memoryState.autoLogin = null;
    await persistState();
}

export async function getAutoLoginCredentials() {
    await ensureStateLoaded();
    return memoryState.autoLogin ? { ...memoryState.autoLogin } : null;
}
