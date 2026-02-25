export type LoginScreenProps = {
    onGuest: () => void;
    onLogin: (payload: { email: string; password: string }) => Promise<void>;
    onRequestPasswordResetCode: (email: string) => Promise<{ email: string; expiresAt: string; debugCode?: string }>;
    onConfirmPasswordReset: (payload: {
        email: string;
        code: string;
        newPassword: string;
        confirmPassword: string;
    }) => Promise<void>;
    onSignUp: (payload: {
        email: string;
        password: string;
        confirmPassword: string;
        fullName: string;
        phoneNumber: string;
    }) => Promise<void>;
    onOpenSignUpFlow?: () => void;
    onOpenPasswordResetFlow?: () => void;
    onOpenRecoveryGuide?: () => void;
    errorMessage?: string | null;
    signUpErrorMessage?: string | null;
    loading?: boolean;
};
