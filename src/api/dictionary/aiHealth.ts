import { AI_HEALTH_URL, OPENAI_FEATURE_ENABLED } from "@/config/openAI";

export type AIProxyHealthStatus = "ok" | "degraded" | "unconfigured" | "unknown";

export type AIProxyHealth = {
    status: AIProxyHealthStatus;
    checkedAt: number;
    lastSuccessAt?: number | null;
    lastFailureAt?: number | null;
    lastFailureRoute?: string | null;
    lastFailureMessage?: string | null;
};

type GetAIProxyHealthOptions = {
    forceFresh?: boolean;
    maxAgeMs?: number;
    timeoutMs?: number;
};

type HealthCacheEntry = {
    expiresAt: number;
    value: AIProxyHealth;
};

const AI_HEALTH_CACHE_TTL_MS = 30 * 1000;
const AI_HEALTH_REQUEST_TIMEOUT_MS = 1500;

let cachedHealth: HealthCacheEntry | null = null;
let inFlightHealthRequest: Promise<AIProxyHealth> | null = null;

function normalizeStatus(value: unknown): AIProxyHealthStatus {
    if (value === "ok" || value === "degraded" || value === "unconfigured") {
        return value;
    }

    return "unknown";
}

function createHealthValue(
    status: AIProxyHealthStatus,
    extras: Omit<Partial<AIProxyHealth>, "status" | "checkedAt"> = {},
): AIProxyHealth {
    return {
        status,
        checkedAt: Date.now(),
        ...extras,
    };
}

function readCachedHealth(now: number, maxAgeMs: number): AIProxyHealth | null {
    if (!cachedHealth) {
        return null;
    }

    if (cachedHealth.expiresAt <= now) {
        cachedHealth = null;
        return null;
    }

    if (now - cachedHealth.value.checkedAt > maxAgeMs) {
        return null;
    }

    return cachedHealth.value;
}

function writeCachedHealth(value: AIProxyHealth, ttlMs: number, now: number): AIProxyHealth {
    cachedHealth = {
        value,
        expiresAt: now + ttlMs,
    };

    return value;
}

export function clearAIProxyHealthCache(): void {
    cachedHealth = null;
    inFlightHealthRequest = null;
}

export function isBackgroundAIWarmupAllowed(health: AIProxyHealth): boolean {
    return health.status === "ok";
}

export async function getAIProxyHealth(options: GetAIProxyHealthOptions = {}): Promise<AIProxyHealth> {
    if (!OPENAI_FEATURE_ENABLED || !AI_HEALTH_URL) {
        return createHealthValue("unconfigured");
    }

    const now = Date.now();
    const ttlMs = options.maxAgeMs ?? AI_HEALTH_CACHE_TTL_MS;
    if (!options.forceFresh) {
        const cached = readCachedHealth(now, ttlMs);
        if (cached) {
            return cached;
        }

        if (inFlightHealthRequest) {
            return await inFlightHealthRequest;
        }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
        controller.abort();
    }, options.timeoutMs ?? AI_HEALTH_REQUEST_TIMEOUT_MS);

    const task = fetch(AI_HEALTH_URL, {
        method: "GET",
        signal: controller.signal,
    })
        .then(async (response) => {
            if (!response.ok) {
                return createHealthValue("unknown");
            }

            const payload = (await response.json()) as Partial<AIProxyHealth> | null;
            return createHealthValue(normalizeStatus(payload?.status), {
                lastSuccessAt: typeof payload?.lastSuccessAt === "number" ? payload.lastSuccessAt : null,
                lastFailureAt: typeof payload?.lastFailureAt === "number" ? payload.lastFailureAt : null,
                lastFailureRoute: typeof payload?.lastFailureRoute === "string" ? payload.lastFailureRoute : null,
                lastFailureMessage: typeof payload?.lastFailureMessage === "string" ? payload.lastFailureMessage : null,
            });
        })
        .catch(() => createHealthValue("unknown"))
        .finally(() => {
            clearTimeout(timeoutId);
            inFlightHealthRequest = null;
        });

    inFlightHealthRequest = task;
    const value = await task;
    return writeCachedHealth(value, ttlMs, Date.now());
}
