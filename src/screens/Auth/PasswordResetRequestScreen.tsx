import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useMemo, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Text, View } from "react-native";

import { AppHeader } from "@/components/AppHeader";
import { PrimaryButton } from "@/components/PrimaryButton";
import { TextField } from "@/components/TextField";
import { PASSWORD_RESET_EMAIL_NOT_FOUND_MESSAGE } from "@/screens/App/AppScreen.constants";
import { AuthStackParamList } from "@/screens/Auth/AuthNavigator.types";
import type { LoginScreenProps } from "@/screens/Auth/LoginScreen.types";
import { createSignupStyles } from "@/screens/Auth/signup/signupStyles";
import { useThemedStyles } from "@/theme/useThemedStyles";
import { getEmailValidationError } from "@/utils/authValidation";

type PasswordResetRequestScreenProps = NativeStackScreenProps<AuthStackParamList, "PasswordResetRequest"> & {
    onRequestCode: LoginScreenProps["onRequestPasswordResetCode"];
};

export function PasswordResetRequestScreen({ navigation, route, onRequestCode }: PasswordResetRequestScreenProps) {
    const styles = useThemedStyles(createSignupStyles);
    const [email, setEmail] = useState(route.params?.prefillEmail ?? "");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);
    const emailError = useMemo(() => getEmailValidationError(normalizedEmail), [normalizedEmail]);
    const isDisabled = submitting || Boolean(emailError);

    const handleRequestCode = async () => {
        if (submitting) {
            return;
        }
        setSubmitting(true);
        setErrorMessage(null);
        try {
            const result = await onRequestCode(normalizedEmail);
            const message = result.debugCode
                ? `인증 코드가 발급되었어요.\n코드: ${result.debugCode}`
                : "입력한 이메일로 비밀번호 재설정 코드를 보냈어요.";
            Alert.alert("인증 코드 발급됨", message);
            navigation.navigate("PasswordResetConfirm", { email: result.email });
        } catch (error) {
            const message = error instanceof Error ? error.message : "인증 코드를 요청하지 못했어요.";
            if (message === PASSWORD_RESET_EMAIL_NOT_FOUND_MESSAGE) {
                Alert.alert("비밀번호 재설정", message);
            } else {
                setErrorMessage(message);
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <View style={styles.safeArea}>
            <AppHeader title="비밀번호 재설정" onBack={() => navigation.goBack()} />
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.select({ ios: "padding", android: undefined })}
            >
                <View style={styles.content}>
                    <Text style={styles.stepText}>Step 1 / 2</Text>
                    <TextField
                        placeholder="가입 이메일 (example@vocationary.com)"
                        autoCapitalize="none"
                        autoCorrect={false}
                        keyboardType="email-address"
                        textContentType="emailAddress"
                        autoComplete="email"
                        returnKeyType="done"
                        value={email}
                        onChangeText={(value) => {
                            setEmail(value);
                            setErrorMessage(null);
                        }}
                        errorText={errorMessage}
                        helperText="가입 이메일로 비밀번호 재설정 인증 코드를 발급해요."
                        clearable
                        onClear={() => {
                            setEmail("");
                            setErrorMessage(null);
                        }}
                    />
                </View>
                <PrimaryButton
                    label="인증 코드 받기"
                    onPress={handleRequestCode}
                    disabled={isDisabled}
                    loading={submitting}
                />
            </KeyboardAvoidingView>
        </View>
    );
}
