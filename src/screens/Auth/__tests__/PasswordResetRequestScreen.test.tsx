import { fireEvent, render, waitFor } from "@testing-library/react-native";
import React from "react";
import { Alert } from "react-native";

import { PasswordResetRequestScreen } from "@/screens/Auth/PasswordResetRequestScreen";
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

describe("PasswordResetRequestScreen", () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("requests a reset code and navigates to confirm screen", async () => {
        const onRequestCode = jest
            .fn()
            .mockResolvedValue({ email: "tester@example.com", expiresAt: "2026-02-21T00:00:00.000Z" });
        const navigation = {
            navigate: jest.fn(),
            goBack: jest.fn(),
        };
        const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);

        const { getByPlaceholderText, getByLabelText } = render(
            <PasswordResetRequestScreen
                navigation={navigation as never}
                route={{ key: "PasswordResetRequest-key", name: "PasswordResetRequest", params: undefined } as never}
                onRequestCode={onRequestCode}
            />,
            { wrapper },
        );

        fireEvent.changeText(getByPlaceholderText("가입 이메일 (example@vocationary.com)"), "TESTER@EXAMPLE.COM ");
        fireEvent.press(getByLabelText("재설정 메일 보내기"));

        await waitFor(() => {
            expect(onRequestCode).toHaveBeenCalledWith("tester@example.com");
            expect(alertSpy).toHaveBeenCalled();
            expect(navigation.navigate).toHaveBeenCalledWith("PasswordResetConfirm", { email: "tester@example.com" });
        });
    });

    it("shows alert popup when email is not registered", async () => {
        const onRequestCode = jest.fn().mockRejectedValue(new Error("가입된 이메일 계정을 찾을 수 없어요."));
        const navigation = {
            navigate: jest.fn(),
            goBack: jest.fn(),
        };
        const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);

        const { getByPlaceholderText, getByLabelText, queryByText } = render(
            <PasswordResetRequestScreen
                navigation={navigation as never}
                route={{ key: "PasswordResetRequest-key", name: "PasswordResetRequest", params: undefined } as never}
                onRequestCode={onRequestCode}
            />,
            { wrapper },
        );

        fireEvent.changeText(getByPlaceholderText("가입 이메일 (example@vocationary.com)"), "nobody@example.com");
        fireEvent.press(getByLabelText("재설정 메일 보내기"));

        await waitFor(() => {
            expect(alertSpy).toHaveBeenCalledWith("비밀번호 재설정", "가입된 이메일 계정을 찾을 수 없어요.");
            expect(queryByText("가입된 이메일 계정을 찾을 수 없어요.")).toBeNull();
        });
    });
});
