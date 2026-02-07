import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React from "react";
import { Text, View } from "react-native";

import { AppHeader } from "@/components/AppHeader";
import { PrimaryButton } from "@/components/PrimaryButton";
import { AuthStackParamList } from "@/screens/Auth/AuthNavigator.types";
import { createSignupStyles } from "@/screens/Auth/signup/signupStyles";
import { useThemedStyles } from "@/theme/useThemedStyles";

export type SignUpIntroScreenProps = NativeStackScreenProps<AuthStackParamList, "SignUpIntro">;

export function SignUpIntroScreen({ navigation }: SignUpIntroScreenProps) {
    const styles = useThemedStyles(createSignupStyles);

    return (
        <View style={styles.safeArea}>
            <AppHeader title="회원가입" showBack />
            <View style={styles.container}>
                <View style={styles.content}>
                    <View style={styles.infoBadge}>
                        <Text style={styles.infoBadgeText}>간단한 4단계</Text>
                    </View>
                    <Text style={styles.headline}>가입을 시작할까요?</Text>
                    <Text style={styles.subhead}>간단한 정보만 입력하면 끝나요.</Text>
                </View>
                <PrimaryButton label="회원가입 시작" onPress={() => navigation.navigate("SignUpEmail")} />
            </View>
        </View>
    );
}
