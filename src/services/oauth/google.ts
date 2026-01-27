import * as WebBrowser from "expo-web-browser";

WebBrowser.maybeCompleteAuthSession();

type GoogleUserInfo = {
    sub: string;
    email: string;
    name?: string | null;
    picture?: string | null;
    email_verified?: boolean;
};

export function getGoogleAuthConfig() {
    const iosClientId = (process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? "").trim();
    const androidClientId = (process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? "").trim();
    const webClientId = (process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "").trim();
    const expoClientId = webClientId || androidClientId || iosClientId || undefined;

    return {
        config: {
            iosClientId: iosClientId || undefined,
            androidClientId: androidClientId || undefined,
            webClientId: webClientId || undefined,
            expoClientId,
            scopes: ["openid", "profile", "email"],
            responseType: "id_token",
        },
        isConfigured: Boolean(iosClientId || androidClientId || webClientId || expoClientId),
    };
}

export async function fetchGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
    const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });

    if (!response.ok) {
        throw new Error("구글 계정 정보를 불러오지 못했어요.");
    }

    const payload = (await response.json()) as Partial<GoogleUserInfo>;
    if (!payload?.sub || !payload.email) {
        throw new Error("구글 계정 이메일을 확인하지 못했어요.");
    }

    return {
        sub: payload.sub,
        email: payload.email.toLowerCase(),
        name: typeof payload.name === "string" ? payload.name : null,
        picture: typeof payload.picture === "string" ? payload.picture : null,
        email_verified: payload.email_verified,
    };
}
