import { fireEvent, render } from "@testing-library/react-native";
import React from "react";

import { LoginScreen } from "@/screens/Auth/LoginScreen";
import { t } from "@/shared/i18n";
import { AppAppearanceProvider } from "@/theme/AppearanceContext";

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
    onSocialLogin: jest.fn(),
    onGuest: jest.fn(),
    loading: false,
    socialLoginAvailability: {
        google: true,
        apple: true,
    },
};

describe("LoginScreen", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("invokes onSocialLogin with google provider", () => {
        const onSocialLogin = jest.fn();
        const { getByLabelText } = render(<LoginScreen {...baseProps} onSocialLogin={onSocialLogin} />, { wrapper });

        fireEvent.press(getByLabelText(t("auth.social.google")));

        expect(onSocialLogin).toHaveBeenCalledWith("google", "login");
    });

    it("displays error message when provided", () => {
        const { getByText } = render(<LoginScreen {...baseProps} errorMessage="로그인에 실패했어요." />, { wrapper });

        expect(getByText("로그인에 실패했어요.")).toBeTruthy();
    });
});
