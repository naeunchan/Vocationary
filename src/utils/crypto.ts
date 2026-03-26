import { Buffer } from "buffer";
import CryptoJS from "crypto-js";

type ExpoCryptoModule = {
    CryptoDigestAlgorithm?: {
        SHA256?: string;
    };
    digestStringAsync?: (algorithm: string, data: string) => Promise<string>;
    getRandomBytesAsync?: (byteLength: number) => Promise<Uint8Array | number[]>;
};

function getExpoCryptoModule(): ExpoCryptoModule | null {
    try {
        return require("expo-crypto") as ExpoCryptoModule;
    } catch {
        return null;
    }
}

export async function digestSha256(input: string): Promise<string> {
    const expoCrypto = getExpoCryptoModule();
    const algorithm = expoCrypto?.CryptoDigestAlgorithm?.SHA256;
    if (typeof expoCrypto?.digestStringAsync === "function" && algorithm) {
        return await expoCrypto.digestStringAsync(algorithm, input);
    }

    return CryptoJS.SHA256(input).toString(CryptoJS.enc.Hex);
}

export async function getRandomBytesAsync(byteLength: number): Promise<Uint8Array> {
    const expoCrypto = getExpoCryptoModule();
    if (typeof expoCrypto?.getRandomBytesAsync === "function") {
        return Uint8Array.from(await expoCrypto.getRandomBytesAsync(byteLength));
    }

    if (globalThis.crypto?.getRandomValues) {
        const bytes = new Uint8Array(byteLength);
        globalThis.crypto.getRandomValues(bytes);
        return bytes;
    }

    const wordArray = CryptoJS.lib.WordArray.random(byteLength);
    return Uint8Array.from(Buffer.from(wordArray.toString(CryptoJS.enc.Hex), "hex"));
}
