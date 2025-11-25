export type LoginScreenProps = {
	onLogin: (username: string, password: string, options?: { rememberMe?: boolean }) => void;
	onSignUp: (
		username: string,
		password: string,
		displayName: string,
		options?: { rememberMe?: boolean },
	) => void;
	onGuest: () => void;
	loading?: boolean;
	errorMessage?: string | null;
	initialMode?: "login" | "signup";
};
