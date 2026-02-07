import React from "react";
import { Text, TextInput, View } from "react-native";

import { createLoginScreenStyles } from "@/screens/Auth/LoginScreen.styles";
import { useAppAppearance } from "@/theme/AppearanceContext";
import { useThemedStyles } from "@/theme/useThemedStyles";

type CredentialFieldsProps = {
    username: string;
    password: string;
    loading: boolean;
    onChangeUsername: (value: string) => void;
    onChangePassword: (value: string) => void;
};

export function CredentialFields({
    username,
    password,
    loading,
    onChangeUsername,
    onChangePassword,
}: CredentialFieldsProps) {
    const styles = useThemedStyles(createLoginScreenStyles);
    const { theme } = useAppAppearance();

    return (
        <View>
            <Text style={styles.inputLabel}>이메일</Text>
            <TextInput
                style={styles.textInput}
                value={username}
                onChangeText={onChangeUsername}
                placeholder="이메일 주소를 입력하세요"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
                autoComplete="email"
                textContentType="emailAddress"
                keyboardType="email-address"
                returnKeyType="next"
                placeholderTextColor={theme.textMuted}
            />

            <Text style={styles.inputLabel}>비밀번호</Text>
            <TextInput
                style={styles.textInput}
                value={password}
                onChangeText={onChangePassword}
                placeholder="비밀번호를 입력하세요"
                secureTextEntry
                editable={!loading}
                autoComplete="password"
                textContentType="password"
                returnKeyType="done"
                placeholderTextColor={theme.textMuted}
            />
        </View>
    );
}
