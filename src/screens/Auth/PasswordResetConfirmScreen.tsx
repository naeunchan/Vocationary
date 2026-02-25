import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useMemo, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Text, TouchableOpacity, View } from "react-native";

import { AppHeader } from "@/components/AppHeader";
import { PrimaryButton } from "@/components/PrimaryButton";
import { TextField } from "@/components/TextField";
import { PASSWORD_RESET_SUCCESS_MESSAGE } from "@/screens/App/AppScreen.constants";
import { AuthStackParamList } from "@/screens/Auth/AuthNavigator.types";
import type { LoginScreenProps } from "@/screens/Auth/LoginScreen.types";
import { createSignupStyles } from "@/screens/Auth/signup/signupStyles";
import { useAppAppearance } from "@/theme/AppearanceContext";
import { useThemedStyles } from "@/theme/useThemedStyles";

type PasswordResetConfirmScreenProps = NativeStackScreenProps<AuthStackParamList, "PasswordResetConfirm"> & {
    onConfirmPasswordReset: LoginScreenProps["onConfirmPasswordReset"];
    onRequestCode: LoginScreenProps["onRequestPasswordResetCode"];
};

export function PasswordResetConfirmScreen({
    navigation,
    route,
    onConfirmPasswordReset,
    onRequestCode,
}: PasswordResetConfirmScreenProps) {
    const styles = useThemedStyles(createSignupStyles);
    const { theme } = useAppAppearance();
    const [code, setCode] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [secureText, setSecureText] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [resendingCode, setResendingCode] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const email = route.params.email;
    const isDisabled = useMemo(
        () => submitting || resendingCode || !code.trim() || !newPassword.trim() || !confirmPassword.trim(),
        [code, confirmPassword, newPassword, resendingCode, submitting],
    );

    const handleConfirm = async () => {
        if (submitting) {
            return;
        }
        setSubmitting(true);
        setErrorMessage(null);
        try {
            await onConfirmPasswordReset({
                email,
                code,
                newPassword,
                confirmPassword,
            });
            Alert.alert("비밀번호 재설정 완료", PASSWORD_RESET_SUCCESS_MESSAGE, [
                {
                    text: "확인",
                    onPress: () => {
                        navigation.reset({
                            index: 0,
                            routes: [{ name: "Login" }],
                        });
                    },
                },
            ]);
        } catch (error) {
            const message = error instanceof Error ? error.message : "비밀번호 재설정을 완료하지 못했어요.";
            setErrorMessage(message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleRetryCodeRequest = async () => {
        if (submitting || resendingCode) {
            return;
        }
        setResendingCode(true);
        setErrorMessage(null);
        try {
            const result = await onRequestCode(email);
            setCode("");
            Alert.alert("재설정 메일 재전송됨", "입력한 이메일로 비밀번호 재설정 링크를 다시 보냈어요.");
        } catch (error) {
            const message = error instanceof Error ? error.message : "인증 코드를 다시 요청하지 못했어요.";
            setErrorMessage(message);
        } finally {
            setResendingCode(false);
        }
    };

    const handleMoveToLogin = () => {
        navigation.reset({
            index: 0,
            routes: [{ name: "Login" }],
        });
    };

    return (
        <View style={styles.safeArea}>
            <AppHeader title="재설정 코드 확인" onBack={() => navigation.goBack()} />
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.select({ ios: "padding", android: undefined })}
            >
                <View style={styles.content}>
                    <Text style={styles.stepText}>Step 2 / 2</Text>
                    <TextField
                        placeholder="재설정 코드(oobCode) 또는 링크"
                        textContentType="oneTimeCode"
                        autoComplete="one-time-code"
                        returnKeyType="done"
                        value={code}
                        onChangeText={(value) => {
                            setCode(value);
                            setErrorMessage(null);
                        }}
                        helperText={`${email}로 받은 메일의 링크 전체 또는 oobCode 값을 입력해주세요.`}
                    />
                    <TextField
                        placeholder="새 비밀번호"
                        autoCapitalize="none"
                        autoCorrect={false}
                        textContentType="newPassword"
                        autoComplete="new-password"
                        secureTextEntry={secureText}
                        value={newPassword}
                        onChangeText={(value) => {
                            setNewPassword(value);
                            setErrorMessage(null);
                        }}
                        rightIcon={
                            <Ionicons
                                name={secureText ? "eye-outline" : "eye-off-outline"}
                                size={18}
                                color={theme.textMuted}
                            />
                        }
                        onRightIconPress={() => setSecureText((prev) => !prev)}
                    />
                    <TextField
                        placeholder="새 비밀번호 확인"
                        autoCapitalize="none"
                        autoCorrect={false}
                        textContentType="password"
                        secureTextEntry={secureText}
                        value={confirmPassword}
                        onChangeText={(value) => {
                            setConfirmPassword(value);
                            setErrorMessage(null);
                        }}
                        errorText={errorMessage}
                    />
                    <TouchableOpacity
                        style={styles.linkRow}
                        onPress={() => {
                            void handleRetryCodeRequest();
                        }}
                        activeOpacity={0.7}
                        disabled={submitting || resendingCode}
                    >
                        <Text style={styles.linkText}>메일 다시 요청</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.linkRow}
                        onPress={handleMoveToLogin}
                        activeOpacity={0.7}
                        disabled={submitting || resendingCode}
                    >
                        <Text style={styles.linkText}>로그인 화면으로 이동</Text>
                    </TouchableOpacity>
                </View>
                <PrimaryButton
                    label="비밀번호 재설정"
                    onPress={handleConfirm}
                    disabled={isDisabled}
                    loading={submitting}
                />
            </KeyboardAvoidingView>
        </View>
    );
}
