import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { createLoginScreenStyles } from "@/screens/Auth/LoginScreen.styles";
import { LoginScreenProps } from "@/screens/Auth/LoginScreen.types";
import { LoginHeader } from "@/screens/Auth/components/LoginHeader";
import { CredentialFields } from "@/screens/Auth/components/CredentialFields";
import { RememberMeToggle } from "@/screens/Auth/components/RememberMeToggle";
import { PrimaryActionButton } from "@/screens/Auth/components/PrimaryActionButton";
import { GuestButton } from "@/screens/Auth/components/GuestButton";
import { AuthModeSwitch } from "@/screens/Auth/components/AuthModeSwitch";
import { SocialLoginButtons } from "@/screens/Auth/components/SocialLoginButtons";
import { EmailVerificationSection } from "@/screens/Auth/components/EmailVerificationSection";
import { getLoginCopy } from "@/screens/Auth/constants/loginCopy";
import { useThemedStyles } from "@/theme/useThemedStyles";
import { t } from "@/shared/i18n";
import {
	EMAIL_VERIFICATION_CODE_REQUIRED_MESSAGE,
	EMAIL_VERIFICATION_INVALID_ERROR_MESSAGE,
	EMAIL_VERIFICATION_REQUIRED_ERROR_MESSAGE,
	EMAIL_VERIFICATION_SENT_MESSAGE,
} from "@/screens/App/AppScreen.constants";

export function LoginScreen({
	onLogin,
	onSignUp,
	onGuest,
	onSocialLogin,
	onSendVerificationCode,
	onVerifyEmailCode,
	loading = false,
	errorMessage,
	initialMode = "login",
	onRequestPasswordReset,
}: LoginScreenProps) {
	const styles = useThemedStyles(createLoginScreenStyles);
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [displayName, setDisplayName] = useState("");
	const [mode, setMode] = useState<"login" | "signup">(initialMode);
	const [rememberMe, setRememberMe] = useState(false);
	const [verificationCode, setVerificationCode] = useState("");
	const [verificationStatus, setVerificationStatus] = useState<"idle" | "sent" | "verified">("idle");
	const [verificationEmail, setVerificationEmail] = useState<string | null>(null);
	const [verificationError, setVerificationError] = useState<string | null>(null);
	const [verificationHint, setVerificationHint] = useState<string | null>(null);
	const [verificationSending, setVerificationSending] = useState(false);
	const [verificationChecking, setVerificationChecking] = useState(false);

	const resetVerificationState = useCallback(() => {
		setVerificationCode("");
		setVerificationStatus("idle");
		setVerificationError(null);
		setVerificationHint(null);
		setVerificationEmail(null);
		setVerificationSending(false);
		setVerificationChecking(false);
	}, []);

	useEffect(() => {
		setMode(initialMode);
		setUsername("");
		setPassword("");
		setConfirmPassword("");
		setDisplayName("");
		resetVerificationState();
	}, [initialMode, resetVerificationState]);

	const trimmedUsername = useMemo(() => username.trim(), [username]);
	const trimmedPassword = useMemo(() => password.trim(), [password]);
	const trimmedDisplayName = useMemo(() => displayName.trim(), [displayName]);
	const trimmedConfirmPassword = useMemo(() => confirmPassword.trim(), [confirmPassword]);

	useEffect(() => {
		if (mode !== "signup") {
			return;
		}
		if (!verificationEmail) {
			return;
		}
		const normalizedInput = trimmedUsername.toLowerCase();
		if (!normalizedInput || normalizedInput !== verificationEmail) {
			resetVerificationState();
		}
	}, [mode, trimmedUsername, verificationEmail, resetVerificationState]);

	const copy = useMemo(() => getLoginCopy(mode), [mode]);
	const isVerificationIncomplete = mode === "signup" && verificationStatus !== "verified";
	const passwordMismatchMessage =
		mode === "signup" && trimmedConfirmPassword.length > 0 && trimmedPassword !== trimmedConfirmPassword
			? "비밀번호가 일치하지 않아요."
			: null;
	const isPasswordMismatch = Boolean(passwordMismatchMessage);
	const isPrimaryDisabled =
		loading ||
		trimmedUsername.length === 0 ||
		trimmedPassword.length === 0 ||
		isVerificationIncomplete ||
		isPasswordMismatch;

	const handlePrimaryPress = useCallback(() => {
		if (isPrimaryDisabled) {
			return;
		}

		if (mode === "login") {
			onLogin(trimmedUsername, trimmedPassword, { rememberMe });
			return;
		}

		if (isPasswordMismatch) {
			return;
		}

		if (verificationStatus !== "verified") {
			setVerificationError(EMAIL_VERIFICATION_REQUIRED_ERROR_MESSAGE);
			return;
		}

		onSignUp(trimmedUsername, trimmedPassword, trimmedDisplayName, { rememberMe });
	}, [
		isPasswordMismatch,
		isPrimaryDisabled,
		mode,
		onLogin,
		onSignUp,
		rememberMe,
		trimmedDisplayName,
		trimmedPassword,
		trimmedUsername,
		verificationStatus,
	]);

	const handleGuestPress = useCallback(() => {
		if (!loading) {
			onGuest();
		}
	}, [loading, onGuest]);

	const handleSendVerificationCodeRequest = useCallback(async () => {
		if (mode !== "signup" || verificationSending || loading) {
			return;
		}
		setVerificationSending(true);
		setVerificationError(null);
		try {
			const payload = await onSendVerificationCode(trimmedUsername);
			const normalizedEmail = trimmedUsername.toLowerCase();
			setVerificationStatus("sent");
			setVerificationCode("");
			setVerificationEmail(normalizedEmail || null);
			setVerificationHint(`테스트용 인증 코드: ${payload.code} (10분 동안 유효해요.)`);
			Alert.alert("인증 코드 발송", `${EMAIL_VERIFICATION_SENT_MESSAGE}\n테스트용 코드: ${payload.code}`);
		} catch (error) {
			const message = error instanceof Error ? error.message : "인증 코드를 보내지 못했어요.";
			setVerificationError(message);
		} finally {
			setVerificationSending(false);
		}
	}, [loading, mode, onSendVerificationCode, trimmedUsername, verificationSending]);

	const handleVerifyEmailCode = useCallback(async () => {
		if (mode !== "signup" || verificationChecking || loading || verificationStatus === "verified") {
			return;
		}
		const trimmedCode = verificationCode.trim();
		if (!trimmedCode) {
			setVerificationError(EMAIL_VERIFICATION_CODE_REQUIRED_MESSAGE);
			return;
		}
		setVerificationChecking(true);
		setVerificationError(null);
		try {
			await onVerifyEmailCode(trimmedUsername, trimmedCode);
			setVerificationStatus("verified");
			setVerificationHint("이메일 인증이 완료되었어요.");
			setVerificationCode(trimmedCode);
			setVerificationEmail(trimmedUsername.toLowerCase() || null);
		} catch (error) {
			const message = error instanceof Error ? error.message : EMAIL_VERIFICATION_INVALID_ERROR_MESSAGE;
			setVerificationError(message);
		} finally {
			setVerificationChecking(false);
		}
	}, [loading, mode, onVerifyEmailCode, trimmedUsername, verificationChecking, verificationCode, verificationStatus]);

	const handleToggleMode = useCallback(() => {
		if (loading) {
			return;
		}
		setMode((previous) => (previous === "login" ? "signup" : "login"));
		setPassword("");
		setConfirmPassword("");
		setDisplayName("");
		resetVerificationState();
	}, [loading, resetVerificationState]);

	const handleForgotPasswordPress = useCallback(() => {
		if (loading) {
			return;
		}
		const suggestedEmail = trimmedUsername || trimmedDisplayName || "";
		onRequestPasswordReset?.(suggestedEmail);
	}, [loading, onRequestPasswordReset, trimmedDisplayName, trimmedUsername]);

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

					<CredentialFields
						mode={mode}
						username={username}
						password={password}
						confirmPassword={confirmPassword}
						confirmPasswordError={passwordMismatchMessage}
						displayName={displayName}
						loading={loading}
						onChangeUsername={setUsername}
						onChangePassword={setPassword}
						onChangeConfirmPassword={setConfirmPassword}
						onChangeDisplayName={setDisplayName}
					/>

					{mode === "signup" ? (
						<EmailVerificationSection
							status={verificationStatus}
							code={verificationCode}
							errorMessage={verificationError}
							hintMessage={verificationHint}
							sending={verificationSending}
							verifying={verificationChecking}
							canSend={trimmedUsername.length > 0}
							canVerify={verificationCode.trim().length > 0}
							disabled={loading}
							onChangeCode={setVerificationCode}
							onSendCode={handleSendVerificationCodeRequest}
							onVerifyCode={handleVerifyEmailCode}
						/>
					) : null}

					<RememberMeToggle value={rememberMe} disabled={loading} onChange={setRememberMe} />

					<PrimaryActionButton
						label={copy.primaryButton}
						loading={loading}
						disabled={isPrimaryDisabled}
						onPress={handlePrimaryPress}
						mode={mode}
					/>

					<TouchableOpacity
						style={styles.linkButton}
						onPress={handleForgotPasswordPress}
						disabled={loading}
						accessibilityRole="button"
						accessibilityLabel={t("auth.forgotPassword")}
					>
						<Text style={styles.linkButtonText}>{t("auth.forgotPassword")}</Text>
					</TouchableOpacity>

					<SocialLoginButtons disabled={loading} />

					<GuestButton loading={loading} onPress={handleGuestPress} />

					<AuthModeSwitch prompt={copy.togglePrompt} actionLabel={copy.toggleAction} disabled={loading} onToggle={handleToggleMode} />

					<Text style={styles.footerNote}>게스트 모드에서는 단어 저장이 최대 10개로 제한돼요.</Text>
				</View>
			</ScrollView>
		</SafeAreaView>
	);
}
