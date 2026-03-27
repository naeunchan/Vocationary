const { createAiResponseCache } = require("../aiResponseCache");

describe("aiResponseCache", () => {
    it("returns cached entries before they expire", () => {
        const cache = createAiResponseCache();

        cache.set("example", { items: ["apple"] }, 1000, 100);

        expect(cache.get("example", 500)).toEqual({ items: ["apple"] });
        expect(cache.get("example", 1200)).toBeNull();
    });

    it("deduplicates in-flight loaders for the same key", async () => {
        const cache = createAiResponseCache();
        const loader = jest.fn(async () => ({ items: ["apple"] }));

        const [first, second] = await Promise.all([
            cache.getOrCreate("example", loader, { ttlMs: 1000, now: 100 }),
            cache.getOrCreate("example", loader, { ttlMs: 1000, now: 100 }),
        ]);

        expect(loader).toHaveBeenCalledTimes(1);
        expect(first.value).toEqual({ items: ["apple"] });
        expect(second.value).toEqual({ items: ["apple"] });
    });

    it("evicts the oldest entry when maxEntries is exceeded", () => {
        const cache = createAiResponseCache({ maxEntries: 1 });

        cache.set("first", { value: 1 }, 1000, 100);
        cache.set("second", { value: 2 }, 1000, 100);

        expect(cache.get("first", 200)).toBeNull();
        expect(cache.get("second", 200)).toEqual({ value: 2 });
    });

    it("does not cache rejected loaders", async () => {
        const cache = createAiResponseCache();
        const loader = jest
            .fn()
            .mockRejectedValueOnce(new Error("boom"))
            .mockResolvedValueOnce({ items: ["apple"] });

        await expect(cache.getOrCreate("example", loader, { ttlMs: 1000, now: 100 })).rejects.toThrow("boom");
        await expect(cache.getOrCreate("example", loader, { ttlMs: 1000, now: 200 })).resolves.toEqual(
            expect.objectContaining({
                value: { items: ["apple"] },
            }),
        );
        expect(loader).toHaveBeenCalledTimes(2);
    });
});
