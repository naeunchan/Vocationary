import React from "react";
import { Alert, Linking, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { FEATURE_FLAGS } from "@/config/featureFlags";
import { createRecoveryGuideStyles } from "@/screens/Settings/RecoveryGuideScreen.styles";
import { useThemedStyles } from "@/theme/useThemedStyles";

const SUPPORT_EMAIL = "support@vocachip.app";
const CONTACT_SUBJECT = "Vocachip 계정 복구 문의";

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
    const showAccountAuth = FEATURE_FLAGS.accountAuth;
    const showAuthActions = showAccountAuth && Boolean(onRequestSignUp || onContinueAsGuest || onRequestPasswordReset);
    const recoveryAlternatives = React.useMemo(() => {
        const steps = showAccountAuth
            ? ["로그인 화면의 `비밀번호를 잊으셨나요?`에서 인증 코드(OTP)로 비밀번호 재설정하기"]
            : ["현재 출시 버전에서는 게스트 모드 학습 경험을 우선 제공하며 계정 기능은 제한적으로 운영됩니다."];

        if (FEATURE_FLAGS.backupRestore) {
            steps.push("복원 가능한 백업 파일이 있다면 설정 > 백업 및 복원 > 백업에서 복원하기 이용");
        }

        if (showAccountAuth) {
            steps.push("인증 코드 만료/오류 시 코드를 재요청한 뒤 다시 진행하기");
            steps.push("로그인이 유지된 기기라면 설정 > 마이 페이지 > 비밀번호 변경에서 바로 변경하기");
        } else {
            steps.push("이미 로그인된 미리보기 계정이 남아 있다면 해당 기기에서 계정 정보를 먼저 확인하기");
        }
        steps.push("문제가 계속되면 고객센터로 문의하기");
        return steps;
    }, [showAccountAuth]);

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
                    {showAccountAuth
                        ? "Vocachip는 로그인 화면에서 인증 코드(OTP) 기반 비밀번호 재설정을 지원합니다. 코드를 확인한 뒤 새 비밀번호를 설정하면 다시 로그인할 수 있어요."
                        : "Vocachip는 현재 게스트 모드 중심으로 제공되며 계정 기능은 제한적으로 운영됩니다. 계정 관련 문제가 있으면 아래 안내와 고객센터 경로를 이용해주세요."}
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
                        {showAccountAuth
                            ? "인증 코드는 일정 시간 후 만료되며 1회만 사용할 수 있어요. 코드가 만료되었거나 이미 사용되었다면 재요청 후 다시 시도해주세요."
                            : "계정 기능이 정식 출시되기 전까지는 게스트 모드 학습 흐름을 기준으로 이용하는 것이 가장 안정적입니다."}
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
