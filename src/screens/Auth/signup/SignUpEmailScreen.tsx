import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useMemo } from "react";
import { useFormContext, useFormState, useWatch } from "react-hook-form";
import { KeyboardAvoidingView, Platform, Text, View } from "react-native";

import { AppHeader } from "@/components/AppHeader";
import { PrimaryButton } from "@/components/PrimaryButton";
import { TextField } from "@/components/TextField";
import { AuthStackParamList } from "@/screens/Auth/AuthNavigator.types";
import { emailSchema, type SignupFormValues } from "@/screens/Auth/signup/signupSchema";
import { createSignupStyles } from "@/screens/Auth/signup/signupStyles";
import { normalizeEmail } from "@/screens/Auth/signup/signupUtils";
import { useThemedStyles } from "@/theme/useThemedStyles";

export type SignUpEmailScreenProps = NativeStackScreenProps<AuthStackParamList, "SignUpEmail">;

export function SignUpEmailScreen({ navigation }: SignUpEmailScreenProps) {
    const styles = useThemedStyles(createSignupStyles);
    const { control, trigger, setValue } = useFormContext<SignupFormValues>();
    const emailValue = useWatch({ control, name: "email" });
    const { errors } = useFormState({ control, name: "email" });

    const normalized = useMemo(() => normalizeEmail(emailValue ?? ""), [emailValue]);
    const isValid = emailSchema.safeParse({ email: normalized }).success;

    const handleNext = async () => {
        const ok = await trigger("email");
        if (!ok) {
            return;
        }
        setValue("email", normalized, { shouldValidate: true });
        navigation.navigate("SignUpName");
    };

    return (
        <View style={styles.safeArea}>
            <AppHeader title="이메일" onBack={() => navigation.goBack()} />
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.select({ ios: "padding", android: undefined })}
            >
                <View style={styles.content}>
                    <Text style={styles.stepText}>Step 1 / 4</Text>
                    <TextField
                        placeholder="이메일 (example@vocationary.com)"
                        autoCapitalize="none"
                        autoCorrect={false}
                        keyboardType="email-address"
                        textContentType="emailAddress"
                        autoComplete="email"
                        returnKeyType="done"
                        value={emailValue ?? ""}
                        onChangeText={(value) => setValue("email", value, { shouldValidate: true })}
                        onBlur={() => setValue("email", normalized, { shouldValidate: true })}
                        errorText={errors.email?.message}
                        clearable
                        onClear={() => setValue("email", "", { shouldValidate: true })}
                    />
                </View>
                <PrimaryButton label="다음" onPress={handleNext} disabled={!isValid} />
            </KeyboardAvoidingView>
        </View>
    );
}
