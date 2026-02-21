import { render } from "@testing-library/react-native";
import React from "react";

import { AuthNavigator } from "@/screens/Auth/AuthNavigator";
import type { LoginScreenProps } from "@/screens/Auth/LoginScreen.types";
import { AppAppearanceProvider } from "@/theme/AppearanceContext";

const mockSignUpPasswordScreen = jest.fn(() => null);

jest.mock("@react-navigation/native", () => {
    const React = require("react");
    return {
        NavigationContainer: ({ children }: { children: React.ReactNode }) => <>{children}</>,
        DefaultTheme: { colors: { background: "#fff", card: "#fff", border: "#fff", primary: "#000", text: "#000" } },
        DarkTheme: { colors: { background: "#000", card: "#000", border: "#000", primary: "#fff", text: "#fff" } },
    };
});

jest.mock("@react-navigation/native-stack", () => {
    const React = require("react");
    return {
        createNativeStackNavigator: () => {
            const Navigator = ({ children }: { children: React.ReactNode }) => <>{children}</>;
            const Screen = ({
                children,
                component: Component,
            }: {
                children?: React.ReactNode | ((props: any) => React.ReactNode);
                component?: React.ComponentType<any>;
            }) => {
                if (typeof children === "function") {
                    return <>{children({ navigation: { navigate: jest.fn(), goBack: jest.fn() }, route: {} })}</>;
                }
                if (Component) {
                    return <Component />;
                }
                return <>{children}</>;
            };
            return { Navigator, Screen };
        },
    };
});

jest.mock("@/screens/Auth/LoginScreen", () => ({
    LoginScreen: () => null,
}));

jest.mock("@/screens/Auth/PasswordResetRequestScreen", () => ({
    PasswordResetRequestScreen: () => null,
}));

jest.mock("@/screens/Auth/PasswordResetConfirmScreen", () => ({
    PasswordResetConfirmScreen: () => null,
}));

jest.mock("@/screens/Auth/signup/SignUpIntroScreen", () => ({
    SignUpIntroScreen: () => null,
}));

jest.mock("@/screens/Auth/signup/SignUpEmailScreen", () => ({
    SignUpEmailScreen: () => null,
}));

jest.mock("@/screens/Auth/signup/SignUpNameScreen", () => ({
    SignUpNameScreen: () => null,
}));

jest.mock("@/screens/Auth/signup/SignUpPhoneScreen", () => ({
    SignUpPhoneScreen: () => null,
}));

jest.mock("@/screens/Auth/signup/SignUpSuccessScreen", () => ({
    SignUpSuccessScreen: () => null,
}));

jest.mock("@/screens/Settings/RecoveryGuideScreen", () => ({
    RecoveryGuideScreen: () => null,
}));

jest.mock("@/screens/Auth/signup/SignUpPasswordScreen", () => ({
    SignUpPasswordScreen: (props: any) => mockSignUpPasswordScreen(props),
}));

jest.mock("@/store/signupStore", () => ({
    SignupProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock("@/screens/Auth/signup/SignUpFormProvider", () => ({
    SignUpFormProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe("AuthNavigator", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("passes sign-up specific error message to SignUpPasswordScreen", () => {
        const loginProps: LoginScreenProps = {
            onGuest: jest.fn(),
            onLogin: jest.fn().mockResolvedValue(undefined),
            onRequestPasswordResetCode: jest
                .fn()
                .mockResolvedValue({ email: "user@example.com", expiresAt: "2026-02-21T00:00:00.000Z" }),
            onConfirmPasswordReset: jest.fn().mockResolvedValue(undefined),
            onSignUp: jest.fn().mockResolvedValue(undefined),
            loading: false,
            errorMessage: "이메일 또는 비밀번호가 올바르지 않아요.",
            signUpErrorMessage: "이미 사용 중인 이메일이에요. 다른 이메일을 사용해주세요.",
        };

        render(
            <AppAppearanceProvider
                mode="light"
                fontScale={1}
                onChangeMode={() => undefined}
                onChangeFontScale={() => undefined}
            >
                <AuthNavigator loginProps={loginProps} />
            </AppAppearanceProvider>,
        );

        expect(mockSignUpPasswordScreen).toHaveBeenCalledWith(
            expect.objectContaining({
                errorMessage: "이미 사용 중인 이메일이에요. 다른 이메일을 사용해주세요.",
            }),
        );
    });
});
