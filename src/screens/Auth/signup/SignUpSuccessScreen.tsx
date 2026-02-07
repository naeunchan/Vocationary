import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Text, View } from "react-native";

import { PrimaryButton } from "@/components/PrimaryButton";
import { AuthStackParamList } from "@/screens/Auth/AuthNavigator.types";
import type { LoginScreenProps } from "@/screens/Auth/LoginScreen.types";
import { createSignupStyles } from "@/screens/Auth/signup/signupStyles";
import { normalizeEmail, normalizeName, normalizePhoneInput } from "@/screens/Auth/signup/signupUtils";
import { useSignupStore } from "@/store/signupStore";
import { useAppAppearance } from "@/theme/AppearanceContext";
import { useThemedStyles } from "@/theme/useThemedStyles";

export type SignUpSuccessScreenProps = NativeStackScreenProps<AuthStackParamList, "SignUpSuccess"> & {
    onSignUp: LoginScreenProps["onSignUp"];
    loading: boolean;
    errorMessage?: string | null;
};

export function SignUpSuccessScreen({ onSignUp, loading, errorMessage }: SignUpSuccessScreenProps) {
    const styles = useThemedStyles(createSignupStyles);
    const { theme } = useAppAppearance();
    const { state } = useSignupStore();
    const scale = useRef(new Animated.Value(0.85)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(scale, { toValue: 1, duration: 320, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 1, duration: 280, useNativeDriver: true }),
        ]).start();
    }, [opacity, scale]);

    const payload = useMemo(
        () => ({
            email: normalizeEmail(state.email),
            password: state.password,
            confirmPassword: state.passwordConfirm,
            fullName: normalizeName(state.name),
            phoneNumber: normalizePhoneInput(state.phone),
        }),
        [state.email, state.name, state.password, state.passwordConfirm, state.phone],
    );

    const handleStart = async () => {
        await onSignUp(payload);
    };

    return (
        <View style={styles.safeArea}>
            <View style={styles.container}>
                <View style={[styles.content, { alignItems: "center", justifyContent: "center" }]}>
                    <Animated.View style={{ transform: [{ scale }], opacity }}>
                        <View style={styles.successIconWrap}>
                            <Ionicons name="checkmark-circle" size={54} color={theme.accent} />
                        </View>
                    </Animated.View>
                    <Text style={styles.successTitle}>가입이 완료됐어요</Text>
                    <Text style={styles.successSubtitle}>이제 Vocationary에서 단어 학습을 시작해볼까요?</Text>
                    {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
                </View>
                <PrimaryButton label="시작하기" onPress={handleStart} loading={loading} />
            </View>
        </View>
    );
}
