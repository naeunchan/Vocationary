import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { LoginScreen } from "@/screens/Auth/LoginScreen";
import { AppAppearanceProvider } from "@/theme/AppearanceContext";

jest.mock("@expo/vector-icons/MaterialCommunityIcons", () => {
	const React = require("react");
	const { Text } = require("react-native");
	return (props: { name: string }) => <Text>{props.name}</Text>;
});

const wrapper: React.ComponentType<React.PropsWithChildren> = ({ children }) => (
	<AppAppearanceProvider mode="light" fontScale={1} onChangeMode={() => undefined} onChangeFontScale={() => undefined}>
		{children}
	</AppAppearanceProvider>
);

const baseProps = {
	onLogin: jest.fn(),
	onSignUp: jest.fn(),
	onGuest: jest.fn(),
	loading: false,
};

describe("LoginScreen", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("invokes onLogin with typed credentials", () => {
		const onLogin = jest.fn();
		const { getByPlaceholderText, getByLabelText } = render(<LoginScreen {...baseProps} onLogin={onLogin} />, {
			wrapper,
		});

		fireEvent.changeText(getByPlaceholderText("이메일 주소를 입력하세요"), " user@example.com ");
		fireEvent.changeText(getByPlaceholderText("비밀번호를 입력하세요"), "secret ");
		fireEvent.press(getByLabelText(/로그인|Log in/));

		expect(onLogin).toHaveBeenCalledWith("user@example.com", "secret", { rememberMe: false });
	});

	it("displays error message when provided", () => {
		const { getByText } = render(
			<LoginScreen
				{...baseProps}
				errorMessage="로그인에 실패했어요."
			/>,
			{ wrapper },
		);

		expect(getByText("로그인에 실패했어요.")).toBeTruthy();
	});
});
