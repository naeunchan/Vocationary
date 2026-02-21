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
    onRequestPasswordReset?: () => void;
};

export function RecoveryGuideScreen({
    onRequestSignUp,
    onContinueAsGuest,
    onRequestPasswordReset,
}: RecoveryGuideScreenProps) {
    const styles = useThemedStyles(createRecoveryGuideStyles);
    const showAuthActions = Boolean(onRequestSignUp || onContinueAsGuest || onRequestPasswordReset);
    const recoveryAlternatives = React.useMemo(() => {
        const steps = ["로그인 화면의 `비밀번호를 잊으셨나요?`에서 이메일 인증 코드(OTP)로 재설정하기"];

        if (FEATURE_FLAGS.backupRestore) {
            steps.push("복원 가능한 백업 파일이 있다면 설정 > 백업 및 복원 > 백업에서 복원하기 이용");
        }

        steps.push("인증 코드 만료/오류 시 코드를 재요청한 뒤 다시 진행하기");
        steps.push("로그인이 유지된 기기라면 설정 > 마이 페이지 > 비밀번호 변경에서 바로 변경하기");
        steps.push("문제가 계속되면 고객센터로 문의하기");
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
                    Vocationary는 로그인 화면에서 이메일 인증 코드(OTP) 기반 비밀번호 재설정을 지원합니다. 코드를 받은
                    뒤 새 비밀번호를 설정하면 즉시 다시 로그인할 수 있어요.
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
                        인증 코드는 일정 시간 후 만료되며 1회만 사용할 수 있어요. 코드가 만료되었거나 이미 사용되었다면
                        재요청 후 다시 시도해주세요.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>바로 이동</Text>
                    {showAuthActions && onRequestPasswordReset ? (
                        <TouchableOpacity
                            style={styles.primaryButton}
                            onPress={onRequestPasswordReset}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.primaryButtonText}>비밀번호 재설정</Text>
                        </TouchableOpacity>
                    ) : null}
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
