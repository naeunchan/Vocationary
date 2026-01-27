import * as Crypto from "expo-crypto";
import { getRandomBytesAsync } from "expo-crypto";

const NONCE_BYTES_LENGTH = 32;

function toHex(bytes: Uint8Array) {
    return Array.from(bytes)
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
}

export async function createAppleAuthNonce(): Promise<{ rawNonce: string; hashedNonce: string }> {
    const bytes = await getRandomBytesAsync(NONCE_BYTES_LENGTH);
    const rawNonce = toHex(bytes);
    const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);

    return { rawNonce, hashedNonce };
}
