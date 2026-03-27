const mockDigestStringAsync = jest.fn(async (_algorithm: string, value: string) => `digest-${value}`);
const asyncStorageStore: Record<string, string> = {};
const mockAsyncStorage = {
    getItem: jest.fn(async (key: string) =>
        Object.prototype.hasOwnProperty.call(asyncStorageStore, key) ? asyncStorageStore[key] : null,
    ),
    setItem: jest.fn(async (key: string, value: string) => {
        asyncStorageStore[key] = value;
    }),
    removeItem: jest.fn(async (key: string) => {
        delete asyncStorageStore[key];
    }),
    clear: jest.fn(async () => {
        Object.keys(asyncStorageStore).forEach((key) => {
            delete asyncStorageStore[key];
        });
    }),
};

jest.mock("@react-native-async-storage/async-storage", () => ({
    __esModule: true,
    ...mockAsyncStorage,
    default: mockAsyncStorage,
}));

jest.mock("expo-crypto", () => ({
    CryptoDigestAlgorithm: { SHA256: "SHA256" },
    digestStringAsync: (...args: [string, string]) => mockDigestStringAsync(...args),
    getRandomBytesAsync: jest.fn(async (length = 16) => new Uint8Array(length)),
}));

type DatabaseModule = typeof import("@/services/database");

function loadDatabaseModule(): DatabaseModule {
    return require("@/services/database") as DatabaseModule;
}

describe("database persistence", () => {
    beforeEach(async () => {
        jest.resetModules();
        await mockAsyncStorage.clear();
        Object.values(mockAsyncStorage).forEach((mockFn) => {
            if (typeof mockFn === "function" && "mockClear" in mockFn) {
                mockFn.mockClear();
            }
        });
        mockDigestStringAsync.mockClear();
    });

    it("persists session, favorites, search history, preferences, and verification state across reloads", async () => {
        const database = loadDatabaseModule();
        await database.initializeDatabase();

        const createdUser = await database.createUser("tester@example.com", "Passw0rd!123", "Tester");
        const currentUser = await database.findUserByUsername("tester@example.com");

        expect(currentUser?.passwordHash).toBeTruthy();

        await database.setUserSession(createdUser.id);
        await database.saveAutoLoginCredentials(createdUser.username, currentUser?.passwordHash ?? "");
        await database.upsertFavoriteForUser(createdUser.id, {
            word: {
                word: "apple",
                phonetic: "/ˈæp.əl/",
                meanings: [{ partOfSpeech: "noun", definitions: [{ definition: "A fruit." }] }],
            },
            status: "toMemorize",
            updatedAt: "2026-03-22T00:00:00.000Z",
        });
        await database.upsertReviewProgressForUser(createdUser.id, {
            word: "apple",
            lastReviewedAt: "2026-03-21T00:00:00.000Z",
            nextReviewAt: "2026-03-24T00:00:00.000Z",
            reviewCount: 2,
            correctStreak: 1,
            incorrectCount: 0,
            lastOutcome: "good",
        });
        await database.saveSearchHistoryEntries([
            {
                term: "apple",
                mode: "en-en",
                searchedAt: "2026-03-22T00:00:00.000Z",
            },
        ]);
        await database.setPreferenceValue("settings.theme.mode", "dark");
        const verification = await database.sendEmailVerificationCode("tester@example.com");

        jest.resetModules();

        const reloadedDatabase = loadDatabaseModule();
        await reloadedDatabase.initializeDatabase();

        expect(await reloadedDatabase.getActiveSession()).toMatchObject({
            isGuest: false,
            user: { username: "tester@example.com" },
        });
        expect(await reloadedDatabase.getAutoLoginCredentials()).toMatchObject({
            username: "tester@example.com",
            passwordHash: currentUser?.passwordHash,
        });
        expect(await reloadedDatabase.getFavoritesByUser(createdUser.id)).toEqual([
            expect.objectContaining({
                word: expect.objectContaining({ word: "apple" }),
                status: "toMemorize",
            }),
        ]);
        expect(await reloadedDatabase.getReviewProgressByUser(createdUser.id)).toEqual({
            apple: {
                word: "apple",
                lastReviewedAt: "2026-03-21T00:00:00.000Z",
                nextReviewAt: "2026-03-24T00:00:00.000Z",
                reviewCount: 2,
                correctStreak: 1,
                incorrectCount: 0,
                lastOutcome: "good",
            },
        });
        expect(await reloadedDatabase.getSearchHistoryEntries()).toEqual([
            {
                term: "apple",
                mode: "en-en",
                searchedAt: "2026-03-22T00:00:00.000Z",
            },
        ]);
        expect(await reloadedDatabase.getPreferenceValue("settings.theme.mode")).toBe("dark");
        await expect(
            reloadedDatabase.consumeEmailVerificationCode("tester@example.com", verification.code),
        ).resolves.toBe("verified");
    });

    it("cleans up account-owned state on deletion without removing app-level search history", async () => {
        const database = loadDatabaseModule();
        await database.initializeDatabase();

        const createdUser = await database.createUser("tester@example.com", "Passw0rd!123", "Tester");
        const currentUser = await database.findUserByUsername("tester@example.com");
        await database.setUserSession(createdUser.id);
        await database.saveAutoLoginCredentials(createdUser.username, currentUser?.passwordHash ?? "");
        await database.upsertFavoriteForUser(createdUser.id, {
            word: {
                word: "orange",
                phonetic: "/ˈɒr.ɪndʒ/",
                meanings: [{ partOfSpeech: "noun", definitions: [{ definition: "A fruit." }] }],
            },
            status: "review",
            updatedAt: "2026-03-22T00:00:00.000Z",
        });
        await database.upsertReviewProgressForUser(createdUser.id, {
            word: "orange",
            lastReviewedAt: "2026-03-22T00:00:00.000Z",
            nextReviewAt: "2026-03-24T00:00:00.000Z",
            reviewCount: 1,
            correctStreak: 1,
            incorrectCount: 0,
            lastOutcome: "good",
        });
        await database.saveSearchHistoryEntries([
            {
                term: "orange",
                mode: "en-en",
                searchedAt: "2026-03-22T00:00:00.000Z",
            },
        ]);
        await database.setPreferenceValue("settings.theme.mode", "dark");
        await database.sendEmailVerificationCode("tester@example.com");

        await database.deleteUserAccount(createdUser.id, createdUser.username);

        expect(await database.getActiveSession()).toBeNull();
        expect(await database.getAutoLoginCredentials()).toBeNull();
        expect(await database.getFavoritesByUser(createdUser.id)).toEqual([]);
        expect(await database.getReviewProgressByUser(createdUser.id)).toEqual({});
        expect(await database.getPreferenceValue("settings.theme.mode")).toBeNull();
        expect(await database.getSearchHistoryEntries()).toEqual([
            {
                term: "orange",
                mode: "en-en",
                searchedAt: "2026-03-22T00:00:00.000Z",
            },
        ]);
    });

    it("clears search history without wiping unrelated preferences", async () => {
        const database = loadDatabaseModule();
        await database.initializeDatabase();

        await database.saveSearchHistoryEntries([
            {
                term: "apple",
                mode: "en-en",
                searchedAt: "2026-03-22T00:00:00.000Z",
            },
        ]);
        await database.setPreferenceValue("settings.theme.mode", "dark");
        await database.clearSearchHistoryEntries();

        expect(await database.getSearchHistoryEntries()).toEqual([]);
        expect(await database.getPreferenceValue("settings.theme.mode")).toBe("dark");

        jest.resetModules();

        const reloadedDatabase = loadDatabaseModule();
        await reloadedDatabase.initializeDatabase();

        expect(await reloadedDatabase.getSearchHistoryEntries()).toEqual([]);
        expect(await reloadedDatabase.getPreferenceValue("settings.theme.mode")).toBe("dark");
    });
});
