import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CredentialFields } from "@/screens/Auth/components/CredentialFields";
import { GuestButton } from "@/screens/Auth/components/GuestButton";
import { LoginHeader } from "@/screens/Auth/components/LoginHeader";
import { PrimaryActionButton } from "@/screens/Auth/components/PrimaryActionButton";
import { getLoginCopy } from "@/screens/Auth/constants/loginCopy";
import { createLoginScreenStyles } from "@/screens/Auth/LoginScreen.styles";
import { LoginScreenProps } from "@/screens/Auth/LoginScreen.types";
import { t } from "@/shared/i18n";
import { useThemedStyles } from "@/theme/useThemedStyles";
import { getEmailValidationError } from "@/utils/authValidation";

export function LoginScreen({
    onGuest,
    onLogin,
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
    const isBusy = loading;

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
