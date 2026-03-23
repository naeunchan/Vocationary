import React from "react";
import { Text, TextInput, View } from "react-native";

import { createLoginScreenStyles } from "@/screens/Auth/LoginScreen.styles";
import { t } from "@/shared/i18n";
import { useAppAppearance } from "@/theme/AppearanceContext";
import { useThemedStyles } from "@/theme/useThemedStyles";

type CredentialFieldsProps = {
    username: string;
    password: string;
    loading: boolean;
    emailError?: string | null;
    passwordError?: string | null;
    onChangeUsername: (value: string) => void;
    onChangePassword: (value: string) => void;
};

export function CredentialFields({
    username,
    password,
    loading,
    emailError,
    passwordError,
    onChangeUsername,
    onChangePassword,
}: CredentialFieldsProps) {
    const styles = useThemedStyles(createLoginScreenStyles);
    const { theme } = useAppAppearance();

    return (
        <View style={styles.fieldStack}>
            <View style={styles.fieldGroup}>
                <Text style={styles.inputLabel}>{t("auth.field.email")}</Text>
                <TextInput
                    style={styles.textInput}
                    value={username}
                    onChangeText={onChangeUsername}
                    placeholder={t("auth.placeholder.email")}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                    autoComplete="email"
                    textContentType="emailAddress"
                    keyboardType="email-address"
                    returnKeyType="next"
                    placeholderTextColor={theme.textMuted}
                />
                {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
            </View>

            <View style={styles.fieldGroup}>
                <Text style={styles.inputLabel}>{t("auth.field.password")}</Text>
                <TextInput
                    style={styles.textInput}
                    value={password}
                    onChangeText={onChangePassword}
                    placeholder={t("auth.placeholder.password")}
                    secureTextEntry
                    editable={!loading}
                    autoComplete="password"
                    textContentType="password"
                    returnKeyType="done"
                    placeholderTextColor={theme.textMuted}
                />
                {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
            </View>
        </View>
    );
}
