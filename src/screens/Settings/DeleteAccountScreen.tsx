import React, { useCallback, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Switch, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ACCOUNT_DELETION_ERROR_MESSAGE, ACCOUNT_DELETION_SUCCESS_MESSAGE } from "@/screens/App/AppScreen.constants";
import { createDeleteAccountScreenStyles } from "@/screens/Settings/DeleteAccountScreen.styles";
import { useThemedStyles } from "@/theme/useThemedStyles";

type DeleteAccountScreenProps = {
    onDeleteAccount: () => Promise<void>;
    onComplete?: () => void;
};

export function DeleteAccountScreen({ onDeleteAccount, onComplete }: DeleteAccountScreenProps) {
    const styles = useThemedStyles(createDeleteAccountScreenStyles);
    const [confirmed, setConfirmed] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleSubmit = useCallback(async () => {
        if (!confirmed || submitting) {
            setErrorMessage("탈퇴 진행을 위해 확인 항목에 동의해주세요.");
            return;
        }
        setSubmitting(true);
        setErrorMessage(null);
        try {
            await onDeleteAccount();
            Alert.alert("회원탈퇴 완료", ACCOUNT_DELETION_SUCCESS_MESSAGE, [{ text: "확인" }]);
            onComplete?.();
        } catch (error) {
            const message = error instanceof Error ? error.message : ACCOUNT_DELETION_ERROR_MESSAGE;
            setErrorMessage(message);
        } finally {
            setSubmitting(false);
        }
    }, [confirmed, onComplete, onDeleteAccount, submitting]);

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.card}>
                    <Text style={styles.title}>회원탈퇴 안내</Text>
                    <Text style={styles.description}>
                        계정을 삭제하면 저장된 단어장, 검색 이력, 설정 등 모든 데이터가 즉시 삭제되며 복구할 수 없어요.{" "}
                        {"\n\n"}
                        단어장 백업이 필요한 경우 탈퇴 전에 별도로 저장해주세요.
                    </Text>
                    <Text style={[styles.description, styles.highlight]}>
                        • 기기(DB)에 저장된 Vocationary 데이터가 모두 삭제돼요.
                    </Text>
                    <View style={styles.checkRow}>
                        <Switch value={confirmed} onValueChange={setConfirmed} />
                        <Text style={styles.checkLabel}>
                            모든 데이터를 삭제하고 Vocationary 계정을 영구적으로 탈퇴하는 것에 동의합니다.
                        </Text>
                    </View>
                    {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
                    <TouchableOpacity
                        style={[styles.button, (!confirmed || submitting) && styles.buttonDisabled]}
                        onPress={handleSubmit}
                        disabled={!confirmed || submitting}
                        activeOpacity={0.85}
                    >
                        {submitting ? (
                            <ActivityIndicator color="#ffffff" />
                        ) : (
                            <Text style={styles.buttonText}>모든 데이터 삭제 후 탈퇴</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
