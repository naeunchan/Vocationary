import React, { useCallback, useMemo, useState } from "react";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { FEATURE_FLAGS } from "@/config/featureFlags";
import { CredentialFields } from "@/screens/Auth/components/CredentialFields";
import { GuestButton } from "@/screens/Auth/components/GuestButton";
import { LoginHeader } from "@/screens/Auth/components/LoginHeader";
import { PrimaryActionButton } from "@/screens/Auth/components/PrimaryActionButton";
import { getLoginCopy } from "@/screens/Auth/constants/loginCopy";
import { createLoginScreenStyles } from "@/screens/Auth/LoginScreen.styles";
import { LoginScreenProps } from "@/screens/Auth/LoginScreen.types";
import { useThemedStyles } from "@/theme/useThemedStyles";

export function LoginScreen({
    onGuest,
    onLogin,
    onSignUp: _onSignUp,
    onOpenSignUpFlow,
    errorMessage,
    loading = false,
}: LoginScreenProps) {
    const styles = useThemedStyles(createLoginScreenStyles);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const authUiEnabled = FEATURE_FLAGS.authUi;
    const copy = useMemo(() => getLoginCopy("login"), []);

    const handleGuestPress = useCallback(() => {
        if (loading) {
            return;
        }
        Alert.alert("게스트 모드 안내", "게스트 모드에서는 단어 저장이 최대 10개로 제한돼요. 계속하시겠어요?", [
            { text: "취소", style: "cancel" },
            { text: "확인", onPress: () => onGuest() },
        ]);
    }, [loading, onGuest]);

    const handlePrimaryPress = useCallback(async () => {
        if (loading) {
            return;
        }
        await onLogin({ email, password });
    }, [email, loading, onLogin, password]);

    const isPrimaryDisabled = loading;

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.content}>
                    <LoginHeader
                        title={authUiEnabled ? copy.title : "Vocationary"}
                        subtitle={
                            authUiEnabled ? copy.subtitle : "게스트 모드로 시작하고 단어 학습을 바로 진행해보세요."
                        }
                    />

                    {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

                    {authUiEnabled ? (
                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>계정 정보</Text>
                            <CredentialFields
                                username={email}
                                password={password}
                                loading={loading}
                                onChangeUsername={setEmail}
                                onChangePassword={setPassword}
                            />
                            <PrimaryActionButton
                                label={copy.primaryButton}
                                loading={loading}
                                disabled={isPrimaryDisabled}
                                onPress={handlePrimaryPress}
                                mode="login"
                            />
                        </View>
                    ) : null}

                    <View style={styles.guestSection}>
                        <View style={styles.dividerRow}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.dividerText}>또는</Text>
                            <View style={styles.dividerLine} />
                        </View>
                        <GuestButton loading={loading} onPress={handleGuestPress} />
                    </View>

                    {authUiEnabled && onOpenSignUpFlow ? (
                        <TouchableOpacity style={styles.flowLink} onPress={onOpenSignUpFlow} disabled={loading}>
                            <Text style={styles.flowLinkText}>회원가입</Text>
                        </TouchableOpacity>
                    ) : null}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
