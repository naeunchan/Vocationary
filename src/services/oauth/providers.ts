import type { OAuthProvider } from "@/services/database";

export const SUPPORTED_OAUTH_PROVIDERS: OAuthProvider[] = ["google", "apple"];

export function isProviderSupported(provider: string): provider is OAuthProvider {
    return SUPPORTED_OAUTH_PROVIDERS.includes(provider as OAuthProvider);
}
