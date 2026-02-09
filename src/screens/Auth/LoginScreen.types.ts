export type LoginScreenProps = {
    onGuest: () => void;
    onLogin: (payload: { email: string; password: string }) => Promise<void>;
    onSignUp: (payload: {
        email: string;
        password: string;
        confirmPassword: string;
        fullName: string;
        phoneNumber: string;
    }) => Promise<void>;
    onOpenSignUpFlow?: () => void;
    onOpenRecoveryGuide?: () => void;
    errorMessage?: string | null;
    signUpErrorMessage?: string | null;
    loading?: boolean;
};
