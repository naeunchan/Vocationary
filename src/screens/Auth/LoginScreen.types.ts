export type LoginScreenProps = {
    onSocialLogin: (provider: "google" | "apple", intent: "login" | "signup") => void;
    socialLoginAvailability?: {
        google?: boolean;
        apple?: boolean;
    };
    socialLoginLoading?: boolean;
    socialLoadingProvider?: "google" | "apple" | null;
    onGuest: () => void;
    errorMessage?: string | null;
    loading?: boolean;
};
