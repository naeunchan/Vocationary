import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Platform, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { GOOGLE_AUTH_ALLOWED_AUDIENCES, GOOGLE_AUTH_CONFIG, GOOGLE_AUTH_ENABLED } from "@/config/socialAuth";
import { CredentialFields } from "@/screens/Auth/components/CredentialFields";
import { GuestButton } from "@/screens/Auth/components/GuestButton";
import { LoginHeader } from "@/screens/Auth/components/LoginHeader";
import { PrimaryActionButton } from "@/screens/Auth/components/PrimaryActionButton";
import { getLoginCopy } from "@/screens/Auth/constants/loginCopy";
import { createLoginScreenStyles } from "@/screens/Auth/LoginScreen.styles";
import { LoginScreenProps } from "@/screens/Auth/LoginScreen.types";
import { resolveGoogleOAuthProfile } from "@/services/auth/googleSignIn";
import { t } from "@/shared/i18n";
import { useThemedStyles } from "@/theme/useThemedStyles";
import { getEmailValidationError } from "@/utils/authValidation";

WebBrowser.maybeCompleteAuthSession();
const DISABLED_GOOGLE_CLIENT_ID = "google-client-id-not-configured";

function pickString(value: unknown): string | null {
    if (typeof value !== "string") {
        return null;
    }
    const trimmed = value.trim();
    return trimmed || null;
}

export function LoginScreen({
    onGuest,
    onLogin,
    onGoogleLogin,
    onSignUp: _onSignUp,
    onOpenSignUpFlow,
    onOpenPasswordResetFlow,
    onOpenRecoveryGuide,
    errorMessage,
    loading = false,
}: LoginScreenProps) {
    const styles = useThemedStyles(createLoginScreenStyles);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const copy = useMemo(() => getLoginCopy("login"), []);
    const [emailError, setEmailError] = useState<string | null>(null);
    const [passwordError, setPasswordError] = useState<string | null>(null);
    const [googleLoading, setGoogleLoading] = useState(false);

    const googleAuthRequestConfig = useMemo(() => {
        const fallbackClientId =
            GOOGLE_AUTH_CONFIG.expoClientId ||
            GOOGLE_AUTH_CONFIG.iosClientId ||
            GOOGLE_AUTH_CONFIG.androidClientId ||
            GOOGLE_AUTH_CONFIG.webClientId ||
            DISABLED_GOOGLE_CLIENT_ID;

        return {
            expoClientId: GOOGLE_AUTH_CONFIG.expoClientId || undefined,
            iosClientId: GOOGLE_AUTH_CONFIG.iosClientId || fallbackClientId,
            androidClientId: GOOGLE_AUTH_CONFIG.androidClientId || fallbackClientId,
            webClientId: GOOGLE_AUTH_CONFIG.webClientId || fallbackClientId,
            scopes: ["openid", "profile", "email"],
            selectAccount: true,
        };
    }, []);
    const [googleRequest, _googleResponse, promptGoogleAsync] = Google.useIdTokenAuthRequest(googleAuthRequestConfig);

    const isPlatformGoogleClientConfigured = useMemo(() => {
        if (Platform.OS === "ios") {
            return Boolean(GOOGLE_AUTH_CONFIG.iosClientId || GOOGLE_AUTH_CONFIG.expoClientId);
        }
        if (Platform.OS === "android") {
            return Boolean(GOOGLE_AUTH_CONFIG.androidClientId || GOOGLE_AUTH_CONFIG.expoClientId);
        }
        if (Platform.OS === "web") {
            return Boolean(GOOGLE_AUTH_CONFIG.webClientId || GOOGLE_AUTH_CONFIG.expoClientId);
        }
        return Boolean(GOOGLE_AUTH_CONFIG.expoClientId);
    }, []);

    const isGoogleLoginAvailable = Boolean(onGoogleLogin && GOOGLE_AUTH_ENABLED && isPlatformGoogleClientConfigured);
    const isBusy = loading || googleLoading;

    const handleGuestPress = useCallback(() => {
        if (isBusy) {
            return;
        }
        Alert.alert("게스트 모드 안내", "게스트 모드에서는 단어 저장이 최대 10개로 제한돼요. 계속하시겠어요?", [
            { text: "취소", style: "cancel" },
            { text: "확인", onPress: () => onGuest() },
        ]);
    }, [isBusy, onGuest]);

    const handleRecoveryPress = useCallback(() => {
        if (isBusy) {
            return;
        }
        if (onOpenPasswordResetFlow) {
            onOpenPasswordResetFlow();
            return;
        }
        if (onOpenRecoveryGuide) {
            onOpenRecoveryGuide();
            return;
        }
        Alert.alert("비밀번호 재설정 안내", "로그인 화면에서 비밀번호 재설정 절차를 진행해주세요.");
    }, [isBusy, onOpenPasswordResetFlow, onOpenRecoveryGuide]);

    const handleGooglePress = useCallback(async () => {
        if (!onGoogleLogin || isBusy || !isGoogleLoginAvailable) {
            return;
        }

        if (!GOOGLE_AUTH_ENABLED) {
            setPasswordError("Google 로그인 설정이 준비되지 않았어요. 잠시 후 다시 시도해주세요.");
            return;
        }

        if (!googleRequest) {
            setPasswordError("Google 로그인을 준비 중이에요. 잠시 후 다시 시도해주세요.");
            return;
        }

        setEmailError(null);
        setPasswordError(null);
        setGoogleLoading(true);

        try {
            const result = await promptGoogleAsync();
            if (result.type !== "success") {
                if (result.type === "cancel" || result.type === "dismiss") {
                    return;
                }
                throw new Error("Google 로그인을 완료하지 못했어요. 다시 시도해주세요.");
            }

            const params = result.params ?? {};
            const auth = (result as { authentication?: { idToken?: unknown; accessToken?: unknown } }).authentication;
            const idToken = pickString(params.id_token) ?? pickString(auth?.idToken);
            const accessToken = pickString(params.access_token) ?? pickString(auth?.accessToken);
            const profile = await resolveGoogleOAuthProfile(
                { idToken, accessToken },
                { allowedAudiences: GOOGLE_AUTH_ALLOWED_AUDIENCES },
            );
            await onGoogleLogin(profile);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Google 로그인 중 문제가 발생했어요.";
            setPasswordError(message);
        } finally {
            setGoogleLoading(false);
        }
    }, [googleRequest, isBusy, isGoogleLoginAvailable, onGoogleLogin, promptGoogleAsync]);

    const handlePrimaryPress = useCallback(async () => {
        if (isBusy) {
            return;
        }
        const nextEmailError = getEmailValidationError(email);
        const nextPasswordError = password.trim() ? null : "비밀번호를 입력해주세요.";
        setEmailError(nextEmailError);
        setPasswordError(nextPasswordError);
        if (nextEmailError || nextPasswordError) {
            return;
        }
        await onLogin({ email, password });
    }, [email, isBusy, onLogin, password]);

    const isPrimaryDisabled = isBusy;

    useEffect(() => {
        if (!errorMessage) {
            return;
        }
        setPasswordError(errorMessage);
    }, [errorMessage]);

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <LoginHeader title="Vocationary" subtitle={copy.subtitle} />
                <View style={styles.content}>
                    <View style={styles.card}>
                        {isGoogleLoginAvailable ? (
                            <>
                                <TouchableOpacity
                                    style={[styles.socialButton, isBusy ? styles.disabledButton : null]}
                                    onPress={handleGooglePress}
                                    disabled={isBusy || !googleRequest}
                                    accessibilityRole="button"
                                    accessibilityLabel="Google로 로그인"
                                    testID="google-login-button"
                                >
                                    {googleLoading ? (
                                        <View style={styles.buttonLoadingRow}>
                                            <ActivityIndicator size="small" />
                                            <Text style={styles.socialLoadingText}>Google 로그인 중...</Text>
                                        </View>
                                    ) : (
                                        <Text style={styles.socialButtonText}>Google로 계속하기</Text>
                                    )}
                                </TouchableOpacity>
                                <View style={styles.socialDividerRow}>
                                    <View style={styles.socialDividerLine} />
                                    <Text style={styles.socialDividerText}>또는 이메일로 로그인</Text>
                                    <View style={styles.socialDividerLine} />
                                </View>
                            </>
                        ) : null}

                        <CredentialFields
                            username={email}
                            password={password}
                            loading={isBusy}
                            emailError={emailError}
                            passwordError={passwordError}
                            onChangeUsername={setEmail}
                            onChangePassword={setPassword}
                        />
                        <TouchableOpacity style={styles.recoveryLink} onPress={handleRecoveryPress} disabled={isBusy}>
                            <Text style={styles.recoveryLinkText}>{t("auth.forgotPassword")}</Text>
                        </TouchableOpacity>
                        <PrimaryActionButton
                            label={copy.primaryButton}
                            loading={isBusy}
                            disabled={isPrimaryDisabled}
                            onPress={handlePrimaryPress}
                            mode="login"
                        />
                    </View>

                    <View style={styles.guestSection}>
                        <GuestButton loading={isBusy} onPress={handleGuestPress} />
                    </View>

                    {onOpenSignUpFlow ? (
                        <TouchableOpacity style={styles.flowLink} onPress={onOpenSignUpFlow} disabled={isBusy}>
                            <Text style={styles.flowLinkText}>회원가입</Text>
                        </TouchableOpacity>
                    ) : null}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
