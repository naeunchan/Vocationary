import React from "react";
import { Text, TextInput, View } from "react-native";
import { createLoginScreenStyles } from "@/screens/Auth/LoginScreen.styles";
import { useThemedStyles } from "@/theme/useThemedStyles";
import { useAppAppearance } from "@/theme/AppearanceContext";

type CredentialFieldsProps = {
	mode: "login" | "signup";
	username: string;
	password: string;
	confirmPassword: string;
	confirmPasswordError?: string | null;
	displayName: string;
	loading: boolean;
	onChangeUsername: (value: string) => void;
	onChangePassword: (value: string) => void;
	onChangeConfirmPassword: (value: string) => void;
	onChangeDisplayName: (value: string) => void;
};

export function CredentialFields({
	mode,
	username,
	password,
	confirmPassword,
	confirmPasswordError,
	displayName,
	loading,
	onChangeUsername,
	onChangePassword,
	onChangeConfirmPassword,
	onChangeDisplayName,
}: CredentialFieldsProps) {
	const styles = useThemedStyles(createLoginScreenStyles);
	const { theme } = useAppAppearance();
	const isSignUp = mode === "signup";

	return (
		<View>
			<Text style={styles.inputLabel}>이메일</Text>
			<TextInput
				style={styles.textInput}
				value={username}
				onChangeText={onChangeUsername}
				placeholder="이메일 주소를 입력하세요"
				autoCapitalize="none"
				autoCorrect={false}
				editable={!loading}
				autoComplete="email"
				textContentType="emailAddress"
				keyboardType="email-address"
				returnKeyType="next"
				placeholderTextColor={theme.textMuted}
			/>
			{isSignUp ? <Text style={styles.ruleText}>가입 시 사용할 이메일 주소를 입력해주세요.</Text> : null}

			<Text style={styles.inputLabel}>비밀번호</Text>
			<TextInput
				style={styles.textInput}
				value={password}
				onChangeText={onChangePassword}
				placeholder="비밀번호를 입력하세요"
				secureTextEntry
				editable={!loading}
				autoComplete={isSignUp ? "new-password" : "password"}
				textContentType={isSignUp ? "newPassword" : "password"}
				returnKeyType={isSignUp ? "next" : "done"}
				placeholderTextColor={theme.textMuted}
			/>
			{isSignUp ? <Text style={styles.ruleText}>비밀번호는 8자 이상이며 영문과 숫자를 모두 포함해야 해요.</Text> : null}

			{isSignUp ? (
				<View>
					<Text style={styles.inputLabel}>비밀번호 확인</Text>
					<TextInput
						style={styles.textInput}
						value={confirmPassword}
						onChangeText={onChangeConfirmPassword}
						placeholder="비밀번호를 다시 입력하세요"
						secureTextEntry
						editable={!loading}
						autoComplete="off"
						returnKeyType="next"
						placeholderTextColor={theme.textMuted}
					/>

					{confirmPasswordError ? <Text style={styles.errorText}>{confirmPasswordError}</Text> : null}

					<Text style={styles.inputLabel}>닉네임 (선택)</Text>
					<TextInput
						style={styles.textInput}
						value={displayName}
						onChangeText={onChangeDisplayName}
						placeholder="앱에서 사용할 닉네임을 입력하세요"
						autoCapitalize="none"
						autoCorrect={false}
						editable={!loading}
						returnKeyType="done"
						placeholderTextColor={theme.textMuted}
					/>
					<Text style={styles.ruleText}>닉네임을 입력하지 않으면 랜덤 이름이 표시돼요.</Text>
				</View>
			) : null}
		</View>
	);
}
