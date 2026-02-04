import React, { useCallback, useMemo, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AuthModeSwitch } from "@/screens/Auth/components/AuthModeSwitch";
import { GuestButton } from "@/screens/Auth/components/GuestButton";
import { LoginHeader } from "@/screens/Auth/components/LoginHeader";
import { getLoginCopy } from "@/screens/Auth/constants/loginCopy";
import { createLoginScreenStyles } from "@/screens/Auth/LoginScreen.styles";
import { LoginScreenProps } from "@/screens/Auth/LoginScreen.types";
import { useThemedStyles } from "@/theme/useThemedStyles";

export function LoginScreen({ onGuest, errorMessage, loading = false }: LoginScreenProps) {
    const styles = useThemedStyles(createLoginScreenStyles);
    const [mode, setMode] = useState<"login" | "signup">("login");
    const copy = useMemo(() => getLoginCopy(mode), [mode]);

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
