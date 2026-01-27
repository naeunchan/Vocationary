import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AuthModeSwitch } from "@/screens/Auth/components/AuthModeSwitch";
import { GuestButton } from "@/screens/Auth/components/GuestButton";
import { LoginHeader } from "@/screens/Auth/components/LoginHeader";
import { getLoginCopy } from "@/screens/Auth/constants/loginCopy";
import { createLoginScreenStyles } from "@/screens/Auth/LoginScreen.styles";
import { LoginScreenProps } from "@/screens/Auth/LoginScreen.types";
import { t } from "@/shared/i18n";
import { useThemedStyles } from "@/theme/useThemedStyles";

export function LoginScreen({
    onSocialLogin,
    socialLoginAvailability,
    socialLoginLoading = false,
    socialLoadingProvider = null,
    onGuest,
    errorMessage,
    loading = false,
}: LoginScreenProps) {
    const styles = useThemedStyles(createLoginScreenStyles);
    const [mode, setMode] = useState<"login" | "signup">("login");
    const copy = useMemo(() => getLoginCopy(mode), [mode]);
    const availability = socialLoginAvailability ?? {};
    const isGoogleDisabled = loading || !availability.google || !onSocialLogin;
    const isAppleDisabled = loading || !availability.apple || !onSocialLogin;
    const isGoogleLoading = socialLoginLoading && socialLoadingProvider === "google";
    const isAppleLoading = socialLoginLoading && socialLoadingProvider === "apple";
    const socialSpinnerColor = (styles.socialLoadingText?.color as string | undefined) || undefined;

    const handleSocialLoginPress = useCallback(() => {
        if (isGoogleDisabled) {
            return;
        }
        onSocialLogin("google", mode);
    }, [isGoogleDisabled, mode, onSocialLogin]);

    const handleSocialLoginApple = useCallback(() => {
        if (isAppleDisabled) {
            return;
        }
        onSocialLogin("apple", mode);
    }, [isAppleDisabled, mode, onSocialLogin]);

    const handleToggleMode = useCallback(() => {
        if (loading) {
            return;
        }
        setMode((previous) => (previous === "login" ? "signup" : "login"));
    }, [loading]);

    const handleGuestPress = useCallback(() => {
        if (loading) {
            return;
        }
        Alert.alert("게스트 모드 안내", "게스트 모드에서는 단어 저장이 최대 10개로 제한돼요. 계속하시겠어요?", [
            { text: "취소", style: "cancel" },
            { text: "확인", onPress: () => onGuest() },
        ]);
    }, [loading, onGuest]);

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.content}>
                    <LoginHeader title={copy.title} subtitle={copy.subtitle} />

                    {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

                    <TouchableOpacity
                        style={[styles.socialButton, isGoogleDisabled && styles.disabledButton]}
                        onPress={handleSocialLoginPress}
                        disabled={isGoogleDisabled}
                        accessibilityRole="button"
                        accessibilityLabel={t("auth.social.google")}
                    >
                        {isGoogleLoading ? (
                            <View style={styles.buttonLoadingRow}>
                                <ActivityIndicator size="small" color={socialSpinnerColor} />
                                <Text style={styles.socialLoadingText}>{t("auth.social.loading")}</Text>
                            </View>
                        ) : (
                            <Text style={styles.socialButtonText}>
                                {mode === "login" ? t("auth.social.google") : t("auth.social.googleSignup")}
                            </Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.socialButton, isAppleDisabled && styles.disabledButton]}
                        onPress={handleSocialLoginApple}
                        disabled={isAppleDisabled}
                        accessibilityRole="button"
                        accessibilityLabel={mode === "login" ? t("auth.social.apple") : t("auth.social.appleSignup")}
                    >
                        {isAppleLoading ? (
                            <View style={styles.buttonLoadingRow}>
                                <ActivityIndicator size="small" color={socialSpinnerColor} />
                                <Text style={styles.socialLoadingText}>{t("auth.social.loading")}</Text>
                            </View>
                        ) : (
                            <Text style={styles.socialButtonText}>
                                {mode === "login" ? t("auth.social.apple") : t("auth.social.appleSignup")}
                            </Text>
                        )}
                    </TouchableOpacity>

                    <GuestButton loading={loading} onPress={handleGuestPress} />

                    <AuthModeSwitch
                        prompt={copy.togglePrompt}
                        actionLabel={copy.toggleAction}
                        disabled={loading}
                        onToggle={handleToggleMode}
                    />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
