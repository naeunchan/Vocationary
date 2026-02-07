import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useMemo } from "react";
import { useFormContext, useFormState, useWatch } from "react-hook-form";
import { KeyboardAvoidingView, Platform, Text, View } from "react-native";

import { AppHeader } from "@/components/AppHeader";
import { PrimaryButton } from "@/components/PrimaryButton";
import { TextField } from "@/components/TextField";
import { AuthStackParamList } from "@/screens/Auth/AuthNavigator.types";
import { nameSchema, type SignupFormValues } from "@/screens/Auth/signup/signupSchema";
import { createSignupStyles } from "@/screens/Auth/signup/signupStyles";
import { normalizeName } from "@/screens/Auth/signup/signupUtils";
import { useThemedStyles } from "@/theme/useThemedStyles";

export type SignUpNameScreenProps = NativeStackScreenProps<AuthStackParamList, "SignUpName">;

export function SignUpNameScreen({ navigation }: SignUpNameScreenProps) {
    const styles = useThemedStyles(createSignupStyles);
    const { control, trigger, setValue } = useFormContext<SignupFormValues>();
    const nameValue = useWatch({ control, name: "name" });
    const { errors } = useFormState({ control, name: "name" });

    const normalized = useMemo(() => normalizeName(nameValue ?? ""), [nameValue]);
    const isValid = nameSchema.safeParse({ name: normalized }).success;

    const handleNext = async () => {
        const ok = await trigger("name");
        if (!ok) {
            return;
        }
        setValue("name", normalized, { shouldValidate: true });
        navigation.navigate("SignUpPhone");
    };

    return (
        <View style={styles.safeArea}>
            <AppHeader title="이름" onBack={() => navigation.goBack()} />
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.select({ ios: "padding", android: undefined })}
            >
                <View style={styles.content}>
                    <Text style={styles.stepText}>Step 2 / 4</Text>
                    <TextField
                        placeholder="이름"
                        autoCapitalize="words"
                        autoCorrect={false}
                        returnKeyType="done"
                        value={nameValue ?? ""}
                        onChangeText={(value) => setValue("name", value, { shouldValidate: true })}
                        onBlur={() => setValue("name", normalized, { shouldValidate: true })}
                        errorText={errors.name?.message}
                    />
                </View>
                <PrimaryButton label="다음" onPress={handleNext} disabled={!isValid} />
            </KeyboardAvoidingView>
        </View>
    );
}
