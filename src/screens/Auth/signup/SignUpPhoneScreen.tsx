import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useMemo } from "react";
import { useFormContext, useFormState, useWatch } from "react-hook-form";
import { KeyboardAvoidingView, Platform, Text, View } from "react-native";

import { AppHeader } from "@/components/AppHeader";
import { PrimaryButton } from "@/components/PrimaryButton";
import { TextField } from "@/components/TextField";
import { AuthStackParamList } from "@/screens/Auth/AuthNavigator.types";
import { phoneSchema, type SignupFormValues } from "@/screens/Auth/signup/signupSchema";
import { createSignupStyles } from "@/screens/Auth/signup/signupStyles";
import { formatPhoneNumber, normalizePhoneInput } from "@/screens/Auth/signup/signupUtils";
import { useThemedStyles } from "@/theme/useThemedStyles";

export type SignUpPhoneScreenProps = NativeStackScreenProps<AuthStackParamList, "SignUpPhone">;

export function SignUpPhoneScreen({ navigation }: SignUpPhoneScreenProps) {
    const styles = useThemedStyles(createSignupStyles);
    const { control, trigger, setValue } = useFormContext<SignupFormValues>();
    const phoneValue = useWatch({ control, name: "phone" });
    const { errors } = useFormState({ control, name: "phone" });

    const normalized = useMemo(() => normalizePhoneInput(phoneValue ?? ""), [phoneValue]);
    const isValid = phoneSchema.safeParse({ phone: normalized }).success;

    const handleNext = async () => {
        const ok = await trigger("phone");
        if (!ok) {
            return;
        }
        setValue("phone", normalized, { shouldValidate: true });
        navigation.navigate("SignUpPassword");
    };

    return (
        <View style={styles.safeArea}>
            <AppHeader title="휴대폰" onBack={() => navigation.goBack()} />
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.select({ ios: "padding", android: undefined })}
            >
                <View style={styles.content}>
                    <Text style={styles.stepText}>Step 3 / 4</Text>
                    <TextField
                        placeholder="휴대폰 번호 (010-0000-0000)"
                        keyboardType="number-pad"
                        textContentType="telephoneNumber"
                        returnKeyType="done"
                        value={formatPhoneNumber(normalized)}
                        onChangeText={(value) =>
                            setValue("phone", normalizePhoneInput(value), { shouldValidate: true })
                        }
                        errorText={errors.phone?.message}
                        helperText="인증번호 없이 기본 정보만 입력해요"
                        clearable
                        onClear={() => setValue("phone", "", { shouldValidate: true })}
                    />
                </View>
                <PrimaryButton label="다음" onPress={handleNext} disabled={!isValid} />
            </KeyboardAvoidingView>
        </View>
    );
}
