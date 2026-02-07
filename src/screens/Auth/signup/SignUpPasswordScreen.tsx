import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useFormContext, useFormState, useWatch } from "react-hook-form";
import { KeyboardAvoidingView, Platform, Text, View } from "react-native";

import { AppHeader } from "@/components/AppHeader";
import { PasswordRules } from "@/components/PasswordRules";
import { PrimaryButton } from "@/components/PrimaryButton";
import { TextField } from "@/components/TextField";
import { AuthStackParamList } from "@/screens/Auth/AuthNavigator.types";
import { getPasswordRuleState, passwordStepSchema, type SignupFormValues } from "@/screens/Auth/signup/signupSchema";
import { createSignupStyles } from "@/screens/Auth/signup/signupStyles";
import { useAppAppearance } from "@/theme/AppearanceContext";
import { useThemedStyles } from "@/theme/useThemedStyles";

export type SignUpPasswordScreenProps = NativeStackScreenProps<AuthStackParamList, "SignUpPassword">;

export function SignUpPasswordScreen({ navigation }: SignUpPasswordScreenProps) {
    const styles = useThemedStyles(createSignupStyles);
    const { theme } = useAppAppearance();
    const { control, trigger, setValue } = useFormContext<SignupFormValues>();
    const { errors } = useFormState({ control, name: ["password", "passwordConfirm"] });
    const [secure, setSecure] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const submitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        submitTimeoutRef.current = setTimeout(() => {
            setSubmitting(false);
            navigation.navigate("SignUpSuccess");
        }, 500);
    };

    useEffect(() => {
        return () => {
            if (submitTimeoutRef.current) {
                clearTimeout(submitTimeoutRef.current);
            }
        };
    }, []);

    return (
        <View style={styles.safeArea}>
            <AppHeader title="비밀번호" onBack={() => navigation.goBack()} />
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.select({ ios: "padding", android: undefined })}
            >
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
                </View>
                <PrimaryButton label="가입 완료" onPress={handleSubmit} disabled={!isValid} loading={submitting} />
            </KeyboardAvoidingView>
        </View>
    );
}
