import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CredentialFields } from "@/screens/Auth/components/CredentialFields";
import { GuestButton } from "@/screens/Auth/components/GuestButton";
import { LoginHeader } from "@/screens/Auth/components/LoginHeader";
import { PrimaryActionButton } from "@/screens/Auth/components/PrimaryActionButton";
import { RememberMeToggle } from "@/screens/Auth/components/RememberMeToggle";
import { getLoginCopy } from "@/screens/Auth/constants/loginCopy";
import { createLoginScreenStyles } from "@/screens/Auth/LoginScreen.styles";
import { LoginScreenProps } from "@/screens/Auth/LoginScreen.types";
import { getPreferenceValue, setPreferenceValue } from "@/services/database";
import { t } from "@/shared/i18n";
import { BIOMETRIC_LOGIN_PREFERENCE_KEY } from "@/theme/constants";
import { useThemedStyles } from "@/theme/useThemedStyles";
import { getEmailValidationError } from "@/utils/authValidation";

export function LoginScreen({
    onGuest,
    onLogin,
    onSignUp: _onSignUp,
    onOpenSignUpFlow,
    onOpenRecoveryGuide,
    errorMessage,
    loading = false,
}: LoginScreenProps) {
    const styles = useThemedStyles(createLoginScreenStyles);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const copy = useMemo(() => getLoginCopy("login"), []);
    const [biometricEnabled, setBiometricEnabled] = useState(false);
    const [emailError, setEmailError] = useState<string | null>(null);
    const [passwordError, setPasswordError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;
        getPreferenceValue(BIOMETRIC_LOGIN_PREFERENCE_KEY)
            .then((value) => {
                if (!mounted) return;
                setBiometricEnabled(value === "true");
            })
            .catch((error) => {
                console.warn("자동 로그인 설정을 불러오는 중 문제가 발생했어요.", error);
            });
        return () => {
            mounted = false;
        };
    }, []);

    const handleToggleBiometric = useCallback((value: boolean) => {
        setBiometricEnabled(value);
        void setPreferenceValue(BIOMETRIC_LOGIN_PREFERENCE_KEY, value ? "true" : "false").catch((error) => {
            console.warn("자동 로그인 설정을 저장하는 중 문제가 발생했어요.", error);
        });
    }, []);

    const handleGuestPress = useCallback(() => {
        if (loading) {
            return;
        }
        Alert.alert("게스트 모드 안내", "게스트 모드에서는 단어 저장이 최대 10개로 제한돼요. 계속하시겠어요?", [
            { text: "취소", style: "cancel" },
            { text: "확인", onPress: () => onGuest() },
        ]);
    }, [loading, onGuest]);

    const handleRecoveryPress = useCallback(() => {
        if (loading) {
            return;
        }
        if (onOpenRecoveryGuide) {
            onOpenRecoveryGuide();
            return;
        }
        Alert.alert(
            "비밀번호 복구 안내",
            "현재 Vocationary는 비밀번호 복구를 지원하지 않습니다. 새 계정을 생성하거나 고객센터로 문의해주세요.",
        );
    }, [loading, onOpenRecoveryGuide]);

    const handlePrimaryPress = useCallback(async () => {
        if (loading) {
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
    }, [email, loading, onLogin, password]);

    const isPrimaryDisabled = loading;

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
                        <CredentialFields
                            username={email}
                            password={password}
                            loading={loading}
                            emailError={emailError}
                            passwordError={passwordError}
                            onChangeUsername={setEmail}
                            onChangePassword={setPassword}
                        />
                        <TouchableOpacity style={styles.recoveryLink} onPress={handleRecoveryPress} disabled={loading}>
                            <Text style={styles.recoveryLinkText}>{t("auth.forgotPassword")}</Text>
                        </TouchableOpacity>
                        <RememberMeToggle
                            value={biometricEnabled}
                            disabled={loading}
                            onChange={handleToggleBiometric}
                        />
                        <PrimaryActionButton
                            label={copy.primaryButton}
                            loading={loading}
                            disabled={isPrimaryDisabled}
                            onPress={handlePrimaryPress}
                            mode="login"
                        />
                    </View>

                    <View style={styles.guestSection}>
                        <GuestButton loading={loading} onPress={handleGuestPress} />
                    </View>

                    {onOpenSignUpFlow ? (
                        <TouchableOpacity style={styles.flowLink} onPress={onOpenSignUpFlow} disabled={loading}>
                            <Text style={styles.flowLinkText}>회원가입</Text>
                        </TouchableOpacity>
                    ) : null}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
