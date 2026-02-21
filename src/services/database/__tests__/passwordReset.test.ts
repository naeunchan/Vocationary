import { consumeEmailVerificationCode, resetPasswordWithEmailCode, sendEmailVerificationCode } from "../index";

const users = [
    {
        id: 1,
        username: "tester@example.com",
        display_name: "Tester",
        phone_number: null,
        password_hash: "sha256.v1:seed:seed-old-password",
        oauth_provider: null,
        oauth_sub: null,
    },
];

const verifications = new Map<
    string,
    {
        email: string;
        code: string;
        expires_at: string;
        verified_at: string | null;
        updated_at: string;
    }
>();

const mockDb = {
    execAsync: jest.fn(async (_sql: string) => undefined),
    withTransactionAsync: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => await fn(mockDb)),
    runAsync: jest.fn(async (sql: string, params?: unknown[]) => {
        if (sql.includes("INSERT INTO email_verifications")) {
            const [email, code, expiresAt] = (params ?? []) as [string, string, string];
            const now = new Date().toISOString();
            verifications.set(email, {
                email,
                code,
                expires_at: expiresAt,
                verified_at: null,
                updated_at: now,
            });
            return;
        }

        if (sql.includes("UPDATE email_verifications SET verified_at")) {
            const [email] = (params ?? []) as [string];
            const existing = verifications.get(email);
            if (existing) {
                const now = new Date().toISOString();
                verifications.set(email, {
                    ...existing,
                    verified_at: now,
                    updated_at: now,
                });
            }
            return;
        }

        if (sql.includes("DELETE FROM email_verifications WHERE email = ?")) {
            const [email] = (params ?? []) as [string];
            verifications.delete(email);
            return;
        }

        if (sql.includes("UPDATE users SET password_hash")) {
            const [passwordHash, userId] = (params ?? []) as [string, number];
            const index = users.findIndex((user) => user.id === userId);
            if (index >= 0) {
                users[index] = {
                    ...users[index],
                    password_hash: passwordHash,
                };
            }
        }
    }),
    getAllAsync: jest.fn(async <T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]> => {
        if (sql.includes("FROM users WHERE username = ?")) {
            const [username] = (params ?? []) as [string];
            const found = users.find((user) => user.username === username);
            return (found ? [found] : []) as unknown as T[];
        }

        if (sql.includes("FROM users WHERE id = ?")) {
            const [userId] = (params ?? []) as [number];
            const found = users.find((user) => user.id === userId);
            return (found ? [found] : []) as unknown as T[];
        }

        if (sql.includes("FROM email_verifications WHERE email = ?")) {
            const [email] = (params ?? []) as [string];
            const found = verifications.get(email);
            return (found ? [found] : []) as unknown as T[];
        }

        return [];
    }),
};

jest.mock("expo-sqlite", () => ({
    openDatabaseAsync: jest.fn(async () => mockDb),
}));

jest.mock("expo-secure-store", () => ({
    setItemAsync: jest.fn(),
    getItemAsync: jest.fn(),
    deleteItemAsync: jest.fn(),
}));

jest.mock("expo-crypto", () => ({
    CryptoDigestAlgorithm: { SHA256: "SHA256" },
    digestStringAsync: jest.fn(async (_algorithm: string, input: string) => `digest:${input}`),
    getRandomBytesAsync: jest.fn(async (length: number) => new Uint8Array(length)),
}));

describe("password reset helpers", () => {
    beforeEach(() => {
        users.splice(0, users.length, {
            id: 1,
            username: "tester@example.com",
            display_name: "Tester",
            phone_number: null,
            password_hash: "sha256.v1:seed:seed-old-password",
            oauth_provider: null,
            oauth_sub: null,
        });
        verifications.clear();
        jest.clearAllMocks();
    });

    it("consumes code once and blocks reuse", async () => {
        const issued = await sendEmailVerificationCode("tester@example.com");
        expect(issued.code).toBe("000000");

        await expect(consumeEmailVerificationCode("tester@example.com", "111111")).resolves.toBe("invalid_code");
        await expect(consumeEmailVerificationCode("tester@example.com", issued.code)).resolves.toBe("verified");
        await expect(consumeEmailVerificationCode("tester@example.com", issued.code)).resolves.toBe("already_used");
    });

    it("returns expired and clears stale verification", async () => {
        const issued = await sendEmailVerificationCode("tester@example.com");
        const record = verifications.get("tester@example.com");
        expect(record).toBeTruthy();
        if (record) {
            record.expires_at = new Date(Date.now() - 1_000).toISOString();
            verifications.set("tester@example.com", record);
        }

        await expect(consumeEmailVerificationCode("tester@example.com", issued.code)).resolves.toBe("expired");
        expect(verifications.has("tester@example.com")).toBe(false);
    });

    it("resets password when code is valid and rejects reused code", async () => {
        const issued = await sendEmailVerificationCode("tester@example.com");

        await expect(resetPasswordWithEmailCode("tester@example.com", issued.code, "Newpass123")).resolves.toBe(
            "success",
        );
        expect(users[0].password_hash).toContain("sha256.v1:");

        await expect(resetPasswordWithEmailCode("tester@example.com", issued.code, "Another123")).resolves.toBe(
            "already_used",
        );
    });

    it("returns not found for unknown email", async () => {
        await expect(resetPasswordWithEmailCode("nobody@example.com", "000000", "Newpass123")).resolves.toBe(
            "email_not_found",
        );
    });
});
