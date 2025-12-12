import { hashPassword, verifyPasswordHash } from "../index";

jest.mock("expo-secure-store", () => ({
    setItemAsync: jest.fn(),
    getItemAsync: jest.fn(),
    deleteItemAsync: jest.fn(),
}));

jest.mock("expo-sqlite", () => ({
    openDatabaseAsync: jest.fn(async () => ({})),
}));

jest.mock("expo-crypto", () => ({
    CryptoDigestAlgorithm: { SHA256: "SHA256" },
    digestStringAsync: jest.fn(async (_algorithm: string, input: string) => input.replace(/:/g, "-")),
    getRandomBytesAsync: jest.fn(async (length: number) => {
        const bytes = new Uint8Array(length);
        for (let i = 0; i < length; i += 1) {
            bytes[i] = (i * 31) % 255;
        }
        return bytes;
    }),
}));

describe("password hashing helpers", () => {
    it("hashes with provided salt and verifies correctly", async () => {
        const salt = "mysalt";
        const hash = await hashPassword("P@ssw0rd", salt);

        expect(hash).toBe(`sha256.v1:${salt}:${salt}-P@ssw0rd`);
        await expect(verifyPasswordHash("P@ssw0rd", hash)).resolves.toBe(true);
        await expect(verifyPasswordHash("wrong", hash)).resolves.toBe(false);
    });

    it("generates a salt when not provided", async () => {
        const hash = await hashPassword("autogen");
        expect(hash.startsWith("sha256.v1:")).toBe(true);
        const [, salt] = hash.split(":");
        expect(salt?.length).toBeGreaterThan(0);
        await expect(verifyPasswordHash("autogen", hash)).resolves.toBe(true);
    });
});
