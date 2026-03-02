import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useEffect, useRef } from "react";
import { Animated, Text, View } from "react-native";

import { PrimaryButton } from "@/components/PrimaryButton";
import { AuthStackParamList } from "@/screens/Auth/AuthNavigator.types";
import { createSignupStyles } from "@/screens/Auth/signup/signupStyles";
import { useAppAppearance } from "@/theme/AppearanceContext";
import { useThemedStyles } from "@/theme/useThemedStyles";

export type SignUpSuccessScreenProps = NativeStackScreenProps<AuthStackParamList, "SignUpSuccess">;

export function SignUpSuccessScreen({ navigation }: SignUpSuccessScreenProps) {
    const styles = useThemedStyles(createSignupStyles);
    const { theme } = useAppAppearance();
    const scale = useRef(new Animated.Value(0.85)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(scale, { toValue: 1, duration: 320, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 1, duration: 280, useNativeDriver: true }),
        ]).start();
    }, [opacity, scale]);

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
                    <Text style={styles.successSubtitle}>이제 Vocachip에서 단어 학습을 시작해볼까요?</Text>
                </View>
                <PrimaryButton label="시작하기" onPress={() => navigation.navigate("Login")} />
            </View>
        </View>
    );
}
