import { fireEvent, render, waitFor } from "@testing-library/react-native";
import React from "react";
import { Alert } from "react-native";

import { PasswordResetConfirmScreen } from "@/screens/Auth/PasswordResetConfirmScreen";
import { AppAppearanceProvider } from "@/theme/AppearanceContext";

jest.mock("@expo/vector-icons", () => {
    const React = require("react");
    const { Text } = require("react-native");
    return {
        Ionicons: (props: { name: string }) => <Text>{props.name}</Text>,
    };
});

jest.mock("@/components/AppHeader", () => ({
    AppHeader: () => null,
}));

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

describe("PasswordResetConfirmScreen", () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("submits reset payload and returns to login on success", async () => {
        const onConfirmPasswordReset = jest.fn().mockResolvedValue(undefined);
        const onRequestCode = jest
            .fn()
            .mockResolvedValue({ email: "tester@example.com", expiresAt: "2026-02-21T00:00:00.000Z" });
        const navigation = {
            navigate: jest.fn(),
            goBack: jest.fn(),
            reset: jest.fn(),
        };
        jest.spyOn(Alert, "alert").mockImplementation((_title, _message, buttons) => {
            const firstButton = Array.isArray(buttons) ? buttons[0] : undefined;
            firstButton?.onPress?.();
        });

        const { getByPlaceholderText, getByLabelText } = render(
            <PasswordResetConfirmScreen
                navigation={navigation as never}
                route={
                    {
                        key: "PasswordResetConfirm-key",
                        name: "PasswordResetConfirm",
                        params: { email: "tester@example.com" },
                    } as never
                }
                onConfirmPasswordReset={onConfirmPasswordReset}
                onRequestCode={onRequestCode}
            />,
            { wrapper },
        );

        fireEvent.changeText(getByPlaceholderText("인증 코드 6자리"), "123456");
        fireEvent.changeText(getByPlaceholderText("새 비밀번호"), "Newpass123");
        fireEvent.changeText(getByPlaceholderText("새 비밀번호 확인"), "Newpass123");
        fireEvent.press(getByLabelText("비밀번호 재설정"));

        await waitFor(() => {
            expect(onConfirmPasswordReset).toHaveBeenCalledWith({
                email: "tester@example.com",
                code: "123456",
                newPassword: "Newpass123",
                confirmPassword: "Newpass123",
            });
            expect(navigation.reset).toHaveBeenCalledWith({
                index: 0,
                routes: [{ name: "Login" }],
            });
        });
    });

    it("re-sends code in place when retry action tapped", async () => {
        const navigation = {
            navigate: jest.fn(),
            goBack: jest.fn(),
            reset: jest.fn(),
        };
        const onRequestCode = jest
            .fn()
            .mockResolvedValue({ email: "tester@example.com", expiresAt: "2026-02-21T00:00:00.000Z" });
        const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);

        const { getByText } = render(
            <PasswordResetConfirmScreen
                navigation={navigation as never}
                route={
                    {
                        key: "PasswordResetConfirm-key",
                        name: "PasswordResetConfirm",
                        params: { email: "tester@example.com" },
                    } as never
                }
                onConfirmPasswordReset={jest.fn()}
                onRequestCode={onRequestCode}
            />,
            { wrapper },
        );

        fireEvent.press(getByText("코드 다시 요청"));

        await waitFor(() => {
            expect(onRequestCode).toHaveBeenCalledWith("tester@example.com");
            expect(alertSpy).toHaveBeenCalled();
            expect(navigation.navigate).not.toHaveBeenCalled();
        });
    });

    it("shows error text when reset fails", async () => {
        const navigation = {
            navigate: jest.fn(),
            goBack: jest.fn(),
            reset: jest.fn(),
        };
        const onConfirmPasswordReset = jest
            .fn()
            .mockRejectedValue(new Error("인증 코드가 만료되었어요. 새 코드를 요청해주세요."));

        const { getByPlaceholderText, getByLabelText, findByText } = render(
            <PasswordResetConfirmScreen
                navigation={navigation as never}
                route={
                    {
                        key: "PasswordResetConfirm-key",
                        name: "PasswordResetConfirm",
                        params: { email: "tester@example.com" },
                    } as never
                }
                onConfirmPasswordReset={onConfirmPasswordReset}
                onRequestCode={jest.fn()}
            />,
            { wrapper },
        );

        fireEvent.changeText(getByPlaceholderText("인증 코드 6자리"), "123456");
        fireEvent.changeText(getByPlaceholderText("새 비밀번호"), "Newpass123");
        fireEvent.changeText(getByPlaceholderText("새 비밀번호 확인"), "Newpass123");
        fireEvent.press(getByLabelText("비밀번호 재설정"));

        expect(await findByText("인증 코드가 만료되었어요. 새 코드를 요청해주세요.")).toBeTruthy();
    });

    it("moves to login screen when login move button tapped", () => {
        const navigation = {
            navigate: jest.fn(),
            goBack: jest.fn(),
            reset: jest.fn(),
        };

        const { getByText } = render(
            <PasswordResetConfirmScreen
                navigation={navigation as never}
                route={
                    {
                        key: "PasswordResetConfirm-key",
                        name: "PasswordResetConfirm",
                        params: { email: "tester@example.com" },
                    } as never
                }
                onConfirmPasswordReset={jest.fn()}
                onRequestCode={jest.fn()}
            />,
            { wrapper },
        );

        fireEvent.press(getByText("로그인 화면으로 이동"));
        expect(navigation.reset).toHaveBeenCalledWith({
            index: 0,
            routes: [{ name: "Login" }],
        });
    });
});
