const { buildPublicBaseUrl, buildTtsAssetToken, buildTtsAssetUrl } = require("../ttsAsset");

describe("ttsAsset", () => {
    it("builds a stable token for the same cache key and secret", () => {
        expect(buildTtsAssetToken("hello", "secret")).toBe(buildTtsAssetToken("hello", "secret"));
        expect(buildTtsAssetToken("hello", "secret")).not.toBe(buildTtsAssetToken("hello", "other"));
    });

    it("prefers forwarded headers when building the public base URL", () => {
        const req = {
            headers: {
                "x-forwarded-proto": "https",
                "x-forwarded-host": "vocachip.app",
            },
            protocol: "http",
            get: jest.fn().mockReturnValue("localhost:4000"),
        };

        expect(buildPublicBaseUrl(req, 4000)).toBe("https://vocachip.app");
    });

    it("builds a playable TTS asset URL", () => {
        const req = {
            headers: {},
            protocol: "https",
            get: jest.fn().mockReturnValue("vocachip.app"),
        };

        expect(buildTtsAssetUrl(req, "abc123", 4000)).toBe("https://vocachip.app/dictionary/tts/abc123");
    });
});
