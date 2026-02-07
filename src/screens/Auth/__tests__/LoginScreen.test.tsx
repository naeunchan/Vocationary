import { fireEvent, render } from "@testing-library/react-native";
import React from "react";
import { Alert } from "react-native";

import { LoginScreen } from "@/screens/Auth/LoginScreen";
import { AppAppearanceProvider } from "@/theme/AppearanceContext";

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
    onSignUp: jest.fn().mockResolvedValue(undefined),
    loading: false,
};

describe("LoginScreen", () => {
    beforeEach(() => {
        jest.clearAllMocks();
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
});
