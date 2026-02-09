import React from "react";
import { Alert, Linking, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { FEATURE_FLAGS } from "@/config/featureFlags";
import { createRecoveryGuideStyles } from "@/screens/Settings/RecoveryGuideScreen.styles";
import { useThemedStyles } from "@/theme/useThemedStyles";

const SUPPORT_EMAIL = "support@vocationary.app";
const CONTACT_SUBJECT = "Vocationary 계정 복구 문의";

type RecoveryGuideScreenProps = {
    onRequestSignUp?: () => void;
    onContinueAsGuest?: () => void;
};

export function RecoveryGuideScreen({ onRequestSignUp, onContinueAsGuest }: RecoveryGuideScreenProps) {
    const styles = useThemedStyles(createRecoveryGuideStyles);
    const showAuthActions = Boolean(onRequestSignUp || onContinueAsGuest);
    const recoveryAlternatives = React.useMemo(() => {
        const steps = [
            "새 계정으로 다시 가입하기",
            "동일 기기에서 자동 로그인/생체 인증이 켜져 있다면 유지된 세션 확인",
        ];

        if (FEATURE_FLAGS.backupRestore) {
            steps.push("복원 가능한 백업 파일이 있다면 설정 > 백업 및 복원 > 백업에서 복원하기 이용");
        }

        steps.push("기존 계정 데이터가 필요한 경우 고객센터로 문의하기");
        return steps;
    }, []);

    const handleContactSupport = React.useCallback(async () => {
        const subject = encodeURIComponent(CONTACT_SUBJECT);
        const body = encodeURIComponent("로그인이 불가능한 상황과 사용 중인 기기를 알려주세요.\n");
        const mailtoUrl = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;

        try {
            const canOpen = await Linking.canOpenURL(mailtoUrl);
            if (!canOpen) {
                throw new Error("Cannot open mail app");
            }
            await Linking.openURL(mailtoUrl);
        } catch (error) {
            Alert.alert("문의하기", `메일 앱을 열 수 없어요.\n${SUPPORT_EMAIL}로 직접 메일을 보내주세요.`);
        }
    }, []);

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.title}>계정 복구 안내</Text>
                <Text style={styles.body}>
                    현재 Vocationary는 보안을 위해 비밀번호를 서버에 저장하지 않으며, 기기 로컬에만 저장합니다. 그래서
                    비밀번호를 분실하면 복구할 수 없어요.
                </Text>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>가능한 대체 방법</Text>
                    {recoveryAlternatives.map((step, index) => (
                        <Text key={step} style={styles.body}>
                            {`${index + 1}. ${step}`}
                        </Text>
                    ))}
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>권장 안내</Text>
                    <Text style={styles.body}>
                        비밀번호를 재설정할 수 없으므로, 자주 사용하는 비밀번호를 기록해두거나 생체 인증 로그인 기능을
                        활성화하는 것을 권장합니다.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>바로 이동</Text>
                    {showAuthActions && onRequestSignUp ? (
                        <TouchableOpacity style={styles.primaryButton} onPress={onRequestSignUp} activeOpacity={0.85}>
                            <Text style={styles.primaryButtonText}>새 계정 만들기</Text>
                        </TouchableOpacity>
                    ) : null}
                    {showAuthActions && onContinueAsGuest ? (
                        <TouchableOpacity
                            style={styles.secondaryButton}
                            onPress={onContinueAsGuest}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.secondaryButtonText}>게스트로 계속하기</Text>
                        </TouchableOpacity>
                    ) : null}
                    <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={handleContactSupport}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.secondaryButtonText}>고객센터 문의하기</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
