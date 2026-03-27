import {
    type BackupPayload,
    findUserByUsername,
    getFavoritesByUser,
    importBackup,
    verifyPasswordHash,
} from "@/services/database";

jest.mock("expo-crypto", () => ({
    CryptoDigestAlgorithm: { SHA256: "SHA256" },
    digestStringAsync: jest.fn(async (_algorithm: string, value: string) => `digest-${value}`),
    getRandomBytesAsync: jest.fn(async (length = 16) => new Uint8Array(length)),
}));

const LEGACY_PASSWORD_SALT = "vocachip::salt";

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

const EMPTY_BACKUP: BackupPayload = {
    version: 1,
    exportedAt: "2026-03-02T00:00:00.000Z",
    users: [],
    favorites: {},
    searchHistory: [],
};

describe("database migration regressions", () => {
    beforeEach(async () => {
        await importBackup(EMPTY_BACKUP);
    });

    it("normalizes imported usernames and preserves favorite ownership", async () => {
        const payload: BackupPayload = {
            version: 1,
            exportedAt: "2026-03-02T00:00:00.000Z",
            users: [
                {
                    username: " Tester@Example.COM ",
                    display_name: "Tester",
                    phone_number: null,
                    password_hash: null,
                    oauth_provider: null,
                    oauth_sub: null,
                },
            ],
            favorites: {
                " TESTER@EXAMPLE.COM ": [
                    {
                        word: {
                            word: "hello",
                            meanings: [],
                        },
                        status: "toMemorize",
                        updatedAt: "2026-03-02T00:00:00.000Z",
                    },
                ],
            },
            searchHistory: [],
        };

        const result = await importBackup(payload);
        expect(result).toMatchObject({
            ok: true,
            code: "OK",
            restored: { users: 1, favorites: 1, searchHistory: 0 },
        });

        const user = await findUserByUsername("tester@example.com");
        expect(user).toMatchObject({
            username: "tester@example.com",
            displayName: "Tester",
        });

        const favorites = await getFavoritesByUser(user!.id);
        expect(favorites).toHaveLength(1);
        expect(favorites[0].word.word).toBe("hello");
    });

    it("accepts legacy password hashes after backup import", async () => {
        const legacyPassword = "Passw0rd!123";
        const payload: BackupPayload = {
            version: 1,
            exportedAt: "2026-03-02T00:00:00.000Z",
            users: [
                {
                    username: "legacy@example.com",
                    display_name: "Legacy User",
                    phone_number: null,
                    password_hash: hashLegacyPassword(legacyPassword),
                    oauth_provider: null,
                    oauth_sub: null,
                },
            ],
            favorites: {
                "legacy@example.com": [],
            },
            searchHistory: [],
        };

        const result = await importBackup(payload);
        expect(result).toMatchObject({
            ok: true,
            code: "OK",
            restored: { users: 1, favorites: 0, searchHistory: 0 },
        });

        const user = await findUserByUsername("legacy@example.com");
        expect(user?.passwordHash).toBeTruthy();

        await expect(verifyPasswordHash(legacyPassword, user?.passwordHash ?? null)).resolves.toBe(true);
        await expect(verifyPasswordHash("wrong-password", user?.passwordHash ?? null)).resolves.toBe(false);
    });

    it("restores review progress from v2 backups while keeping username ownership normalized", async () => {
        const payload: BackupPayload = {
            version: 2,
            exportedAt: "2026-03-02T00:00:00.000Z",
            users: [
                {
                    username: " reviewer@example.com ",
                    display_name: "Reviewer",
                    phone_number: null,
                    password_hash: null,
                    oauth_provider: null,
                    oauth_sub: null,
                },
            ],
            favorites: {
                "reviewer@example.com": [
                    {
                        word: {
                            word: "focus",
                            meanings: [],
                        },
                        status: "review",
                        updatedAt: "2026-03-02T00:00:00.000Z",
                    },
                ],
            },
            reviewProgress: {
                " REVIEWER@EXAMPLE.COM ": {
                    focus: {
                        word: "focus",
                        lastReviewedAt: "2026-03-01T00:00:00.000Z",
                        nextReviewAt: "2026-03-03T00:00:00.000Z",
                        reviewCount: 3,
                        correctStreak: 2,
                        incorrectCount: 1,
                        lastOutcome: "good",
                    },
                },
            },
            searchHistory: [],
        };

        const result = await importBackup(payload);
        expect(result).toMatchObject({
            ok: true,
            code: "OK",
            restored: { users: 1, favorites: 1, searchHistory: 0 },
        });

        const database = require("@/services/database") as typeof import("@/services/database");
        const user = await findUserByUsername("reviewer@example.com");
        expect(await database.getReviewProgressByUser(user!.id)).toEqual({
            focus: {
                word: "focus",
                lastReviewedAt: "2026-03-01T00:00:00.000Z",
                nextReviewAt: "2026-03-03T00:00:00.000Z",
                reviewCount: 3,
                correctStreak: 2,
                incorrectCount: 1,
                lastOutcome: "good",
            },
        });
    });
});
