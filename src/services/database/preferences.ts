import { ensureStateLoaded, memoryState, persistState } from "@/services/database/state";

export async function getPreferenceValue(key: string) {
    await ensureStateLoaded();
    return Object.prototype.hasOwnProperty.call(memoryState.preferences, key) ? memoryState.preferences[key] : null;
}

export async function setPreferenceValue(key: string, value: string) {
    await ensureStateLoaded();
    memoryState.preferences[key] = value;
    await persistState();
}

export function clearPreferenceValues() {
    memoryState.preferences = {};
}
