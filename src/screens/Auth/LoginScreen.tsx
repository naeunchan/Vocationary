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
import { getLoginCopy } from "@/screens/Auth/constants/loginCopy";
import { useThemedStyles } from "@/theme/useThemedStyles";
import { t } from "@/shared/i18n";

export function LoginScreen({
	onLogin,
	onSignUp,
	onGuest,
	loading = false,
	errorMessage,
	initialMode = "login",
}: LoginScreenProps) {
	const styles = useThemedStyles(createLoginScreenStyles);
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [displayName, setDisplayName] = useState("");
	const [mode, setMode] = useState<"login" | "signup">(initialMode);
	const [rememberMe, setRememberMe] = useState(false);
	useEffect(() => {
		setMode(initialMode);
		setUsername("");
		setPassword("");
		setConfirmPassword("");
		setDisplayName("");
	}, [initialMode]);

	const trimmedUsername = useMemo(() => username.trim(), [username]);
	const trimmedPassword = useMemo(() => password.trim(), [password]);
	const trimmedDisplayName = useMemo(() => displayName.trim(), [displayName]);
	const trimmedConfirmPassword = useMemo(() => confirmPassword.trim(), [confirmPassword]);

	const copy = useMemo(() => getLoginCopy(mode), [mode]);
	const passwordMismatchMessage =
		mode === "signup" && trimmedConfirmPassword.length > 0 && trimmedPassword !== trimmedConfirmPassword
			? "비밀번호가 일치하지 않아요."
			: null;
	const isPasswordMismatch = Boolean(passwordMismatchMessage);
	const isPrimaryDisabled =
		loading || trimmedUsername.length === 0 || trimmedPassword.length === 0 || isPasswordMismatch;

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
	]);

	const handleGuestPress = useCallback(() => {
		if (!loading) {
			onGuest();
		}
	}, [loading, onGuest]);

	const handleToggleMode = useCallback(() => {
		if (loading) {
			return;
		}
		setMode((previous) => (previous === "login" ? "signup" : "login"));
		setPassword("");
		setConfirmPassword("");
		setDisplayName("");
	}, [loading]);

	const handleForgotPasswordPress = useCallback(() => {
		if (loading) {
			return;
		}
		Alert.alert(
			"비밀번호 안내",
			"이 앱의 계정은 기기 내부에만 저장돼요. 비밀번호를 잊은 경우 기기에서 로그아웃 후 새 계정을 만들어주세요.",
		);
	}, [loading]);

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

					<Text style={styles.helperText}>계정과 단어장은 이 기기에만 저장돼요. 다른 기기에서는 새 계정을 만들어야 해요.</Text>
					<Text style={styles.helperText}>비밀번호를 잊으면 복구할 수 없으니 안전한 곳에 보관해주세요.</Text>

					<GuestButton loading={loading} onPress={handleGuestPress} />

					<AuthModeSwitch prompt={copy.togglePrompt} actionLabel={copy.toggleAction} disabled={loading} onToggle={handleToggleMode} />

					<Text style={styles.footerNote}>게스트 모드에서는 단어 저장이 최대 10개로 제한돼요.</Text>
				</View>
			</ScrollView>
		</SafeAreaView>
	);
}
