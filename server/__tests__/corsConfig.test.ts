const {
    buildAppsInTossOrigins,
    createCorsOriginResolver,
    getAllowedCorsOrigins,
    parseOriginList,
} = require("../corsConfig");

describe("corsConfig", () => {
    it("parses comma-separated origins", () => {
        expect(parseOriginList(" https://a.test,https://b.test ,, ")).toEqual(["https://a.test", "https://b.test"]);
    });

    it("builds Apps in Toss origins from app name", () => {
        expect(buildAppsInTossOrigins("Vocachip")).toEqual([
            "https://vocachip.apps.tossmini.com",
            "https://vocachip.private-apps.tossmini.com",
        ]);
    });

    it("merges configured origins with Apps in Toss origins without duplicates", () => {
        expect(
            getAllowedCorsOrigins({
                configuredOrigins: "https://custom.test,https://vocachip.apps.tossmini.com",
                appName: "vocachip",
            }),
        ).toEqual([
            "https://custom.test",
            "https://vocachip.apps.tossmini.com",
            "https://vocachip.private-apps.tossmini.com",
        ]);
    });

    it("allows requests without an origin header", () => {
        const resolver = createCorsOriginResolver({
            allowedOrigins: ["https://vocachip.apps.tossmini.com"],
            isProduction: true,
        });

        resolver(undefined, (error, allowed) => {
            expect(error).toBeNull();
            expect(allowed).toBe(true);
        });
    });

    it("blocks unknown origins in production when an allowlist exists", () => {
        const resolver = createCorsOriginResolver({
            allowedOrigins: ["https://vocachip.apps.tossmini.com"],
            isProduction: true,
        });

        resolver("https://unknown.test", (error, allowed) => {
            expect(error).toBeNull();
            expect(allowed).toBe(false);
        });
    });

    it("allows arbitrary origins in development when no allowlist exists", () => {
        const resolver = createCorsOriginResolver({ allowedOrigins: [], isProduction: false });

        resolver("https://localhost:19006", (error, allowed) => {
            expect(error).toBeNull();
            expect(allowed).toBe(true);
        });
    });

    it("blocks arbitrary browser origins in production when no allowlist exists", () => {
        const resolver = createCorsOriginResolver({ allowedOrigins: [], isProduction: true });

        resolver("https://localhost:19006", (error, allowed) => {
            expect(error).toBeNull();
            expect(allowed).toBe(false);
        });
    });
});
