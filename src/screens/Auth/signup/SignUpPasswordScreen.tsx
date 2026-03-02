import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useFormContext, useFormState, useWatch } from "react-hook-form";
import { KeyboardAvoidingView, Text, View } from "react-native";

import { AppHeader } from "@/components/AppHeader";
import { PasswordRules } from "@/components/PasswordRules";
import { PrimaryButton } from "@/components/PrimaryButton";
import { TextField } from "@/components/TextField";
import { AuthStackParamList } from "@/screens/Auth/AuthNavigator.types";
import type { LoginScreenProps } from "@/screens/Auth/LoginScreen.types";
import { getPasswordRuleState, passwordStepSchema, type SignupFormValues } from "@/screens/Auth/signup/signupSchema";
import { createSignupStyles } from "@/screens/Auth/signup/signupStyles";
import { normalizeEmail, normalizeName, normalizePhoneInput } from "@/screens/Auth/signup/signupUtils";
import { useSignupStore } from "@/store/signupStore";
import { useAppAppearance } from "@/theme/AppearanceContext";
import { useThemedStyles } from "@/theme/useThemedStyles";

export type SignUpPasswordScreenProps = NativeStackScreenProps<AuthStackParamList, "SignUpPassword"> & {
    onSignUp: LoginScreenProps["onSignUp"];
    loading: boolean;
    errorMessage?: string | null;
};

export function SignUpPasswordScreen({ navigation, onSignUp, loading, errorMessage }: SignUpPasswordScreenProps) {
    const styles = useThemedStyles(createSignupStyles);
    const { theme } = useAppAppearance();
    const { control, trigger, setValue } = useFormContext<SignupFormValues>();
    const { errors } = useFormState({ control, name: ["password", "passwordConfirm"] });
    const [secure, setSecure] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [awaitingResult, setAwaitingResult] = useState(false);
    const submitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const { state } = useSignupStore();

    const password = useWatch({ control, name: "password" }) ?? "";
    const passwordConfirm = useWatch({ control, name: "passwordConfirm" }) ?? "";
    const rules = useMemo(() => getPasswordRuleState(password, passwordConfirm), [password, passwordConfirm]);
    const isValid = passwordStepSchema.safeParse({ password, passwordConfirm }).success;

    const handleSubmit = async () => {
        const ok = await trigger(["password", "passwordConfirm"]);
        if (!ok) {
            return;
        }
        setSubmitting(true);
        setAwaitingResult(true);
        submitTimeoutRef.current = setTimeout(async () => {
            await onSignUp({
                email: normalizeEmail(state.email),
                password: state.password,
                confirmPassword: state.passwordConfirm,
                fullName: normalizeName(state.name),
                phoneNumber: normalizePhoneInput(state.phone),
            });
            setSubmitting(false);
        }, 500);
    };

    useEffect(() => {
        return () => {
            if (submitTimeoutRef.current) {
                clearTimeout(submitTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (!awaitingResult || loading) {
            return;
        }
        if (errorMessage) {
            setAwaitingResult(false);
            return;
        }
        setAwaitingResult(false);
        navigation.navigate("SignUpSuccess");
    }, [awaitingResult, errorMessage, loading, navigation]);

    return (
        <View style={styles.safeArea}>
            <AppHeader title="비밀번호" onBack={() => navigation.goBack()} />
            <KeyboardAvoidingView style={styles.container}>
                <View style={styles.content}>
                    <Text style={styles.stepText}>Step 4 / 4</Text>
                    <TextField
                        placeholder="비밀번호"
                        autoCapitalize="none"
                        autoCorrect={false}
                        textContentType="newPassword"
                        autoComplete="new-password"
                        secureTextEntry={secure}
                        value={password}
                        onChangeText={(value) => setValue("password", value, { shouldValidate: true })}
                        errorText={errors.password?.message}
                        rightIcon={
                            <Ionicons
                                name={secure ? "eye-outline" : "eye-off-outline"}
                                size={18}
                                color={theme.textMuted}
                            />
                        }
                        onRightIconPress={() => setSecure((prev) => !prev)}
                    />
                    <TextField
                        placeholder="비밀번호 확인"
                        autoCapitalize="none"
                        autoCorrect={false}
                        textContentType="password"
                        secureTextEntry={secure}
                        value={passwordConfirm}
                        onChangeText={(value) => setValue("passwordConfirm", value, { shouldValidate: true })}
                        errorText={errors.passwordConfirm?.message}
                    />
                    <PasswordRules state={rules} />
                    {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
                </View>
                <PrimaryButton
                    label="가입 완료"
                    onPress={handleSubmit}
                    disabled={!isValid || loading}
                    loading={submitting || loading}
                />
            </KeyboardAvoidingView>
        </View>
    );
}
