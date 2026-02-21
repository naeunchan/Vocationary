import { fireEvent, render, waitFor } from "@testing-library/react-native";
import React from "react";
import { Alert } from "react-native";

import { LoginScreen } from "@/screens/Auth/LoginScreen";
import { AppAppearanceProvider } from "@/theme/AppearanceContext";

const mockPromptGoogleAsync = jest.fn();
const mockResolveGoogleOAuthProfile = jest.fn().mockResolvedValue({
    provider: "google",
    subject: "google-sub",
    email: "user@example.com",
    displayName: "User",
});

jest.mock("expo-web-browser", () => ({
    maybeCompleteAuthSession: jest.fn(),
}));

jest.mock("expo-auth-session/providers/google", () => ({
    useIdTokenAuthRequest: jest.fn(() => [{ type: "request" }, null, mockPromptGoogleAsync]),
}));

jest.mock("@/config/socialAuth", () => ({
    GOOGLE_AUTH_CONFIG: {
        expoClientId: "expo-client-id",
        iosClientId: "ios-client-id",
        androidClientId: "android-client-id",
        webClientId: "web-client-id",
    },
    GOOGLE_AUTH_ALLOWED_AUDIENCES: ["expo-client-id", "ios-client-id", "android-client-id", "web-client-id"],
    GOOGLE_AUTH_ENABLED: true,
}));

jest.mock("@/services/auth/googleSignIn", () => ({
    resolveGoogleOAuthProfile: (...args: unknown[]) => mockResolveGoogleOAuthProfile(...args),
}));

jest.mock("@/services/database", () => ({
    getPreferenceValue: jest.fn().mockResolvedValue("false"),
    setPreferenceValue: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@expo/vector-icons/MaterialCommunityIcons", () => {
    const React = require("react");
    const { Text } = require("react-native");
    return (props: { name: string }) => <Text>{props.name}</Text>;
});

const wrapper: React.ComponentType<React.PropsWithChildren> = ({ children }) => (
    <AppAppearanceProvider
        mode="light"
        fontScale={1}
        onChangeMode={() => undefined}
        onChangeFontScale={() => undefined}
    >
        {children}
    </AppAppearanceProvider>
);

const baseProps = {
    onGuest: jest.fn(),
    onLogin: jest.fn().mockResolvedValue(undefined),
    onGoogleLogin: jest.fn().mockResolvedValue(undefined),
    onRequestPasswordResetCode: jest
        .fn()
        .mockResolvedValue({ email: "user@example.com", expiresAt: "2026-02-21T00:00:00.000Z" }),
    onConfirmPasswordReset: jest.fn().mockResolvedValue(undefined),
    onSignUp: jest.fn().mockResolvedValue(undefined),
    loading: false,
};

describe("LoginScreen", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockPromptGoogleAsync.mockResolvedValue({
            type: "success",
            params: { id_token: "id-token", access_token: "access-token" },
        });
    });

    it("shows guest confirmation alert on guest button press", () => {
        const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
        const { getByLabelText } = render(<LoginScreen {...baseProps} />, { wrapper });

        fireEvent.press(getByLabelText("게스트로 둘러보기"));

        expect(alertSpy).toHaveBeenCalled();
    });

    it("displays error message when provided", async () => {
        const { findByText } = render(<LoginScreen {...baseProps} errorMessage="로그인에 실패했어요." />, {
            wrapper,
        });

        expect(await findByText("로그인에 실패했어요.")).toBeTruthy();
    });

    it("opens password reset flow when recovery link is pressed", () => {
        const onOpenPasswordResetFlow = jest.fn();
        const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
        const { getByText } = render(<LoginScreen {...baseProps} onOpenPasswordResetFlow={onOpenPasswordResetFlow} />, {
            wrapper,
        });

        fireEvent.press(getByText("비밀번호를 잊으셨나요?"));

        expect(onOpenPasswordResetFlow).toHaveBeenCalled();
        expect(alertSpy).not.toHaveBeenCalled();
    });

    it("calls onGoogleLogin after successful Google auth", async () => {
        const onGoogleLogin = jest.fn().mockResolvedValue(undefined);
        const { getByTestId } = render(<LoginScreen {...baseProps} onGoogleLogin={onGoogleLogin} />, { wrapper });

        fireEvent.press(getByTestId("google-login-button"));

        await waitFor(() => {
            expect(mockResolveGoogleOAuthProfile).toHaveBeenCalled();
            expect(onGoogleLogin).toHaveBeenCalledWith({
                provider: "google",
                subject: "google-sub",
                email: "user@example.com",
                displayName: "User",
            });
        });
    });
});
