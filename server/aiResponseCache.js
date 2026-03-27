function cloneCacheValue(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
}

function createAiResponseCache(options = {}) {
    const maxEntries = Number.isFinite(options.maxEntries) ? Math.max(1, Math.round(options.maxEntries)) : 200;
    const cache = new Map();
    const inFlight = new Map();

    function evictOverflow() {
        while (cache.size > maxEntries) {
            const oldestKey = cache.keys().next().value;
            if (oldestKey === undefined) {
                return;
            }
            cache.delete(oldestKey);
        }
    }

    function get(key, now = Date.now()) {
        const cached = cache.get(key);
        if (!cached) {
            return null;
        }

        if (cached.expiresAt <= now) {
            cache.delete(key);
            return null;
        }

        return cloneCacheValue(cached.value);
    }

    function set(key, value, ttlMs, now = Date.now()) {
        const normalizedTtl = Number.isFinite(ttlMs) ? Math.max(1, Math.round(ttlMs)) : 1000;
        const cachedValue = cloneCacheValue(value);

        cache.set(key, {
            value: cachedValue,
            expiresAt: now + normalizedTtl,
        });
        evictOverflow();

        return cloneCacheValue(cachedValue);
    }

    async function getOrCreate(key, loader, options = {}) {
        const now = options.now ?? Date.now();
        const ttlMs = options.ttlMs;
        const cached = get(key, now);
        if (cached !== null) {
            return { value: cached, cacheHit: true };
        }

        const pending = inFlight.get(key);
        if (pending) {
            const value = await pending;
            return { value: cloneCacheValue(value), cacheHit: true };
        }

        const task = Promise.resolve()
            .then(loader)
            .then((value) => set(key, value, ttlMs, now));

        inFlight.set(key, task);

        try {
            const value = await task;
            return { value: cloneCacheValue(value), cacheHit: false };
        } finally {
            inFlight.delete(key);
        }
    }

    function clear() {
        cache.clear();
        inFlight.clear();
    }

    return {
        clear,
        get,
        getOrCreate,
        set,
    };
}

module.exports = {
    createAiResponseCache,
};
