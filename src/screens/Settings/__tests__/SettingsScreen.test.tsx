import React from "react";
import { act, fireEvent, render } from "@testing-library/react-native";
import { Alert, Linking } from "react-native";
import { SettingsScreen } from "@/screens/Settings/SettingsScreen";

jest.mock("@expo/vector-icons/Ionicons", () => {
	const React = require("react");
	const { Text } = require("react-native");
	return (props: { name: string }) => <Text>{props.name}</Text>;
});

jest.mock("@/screens/Settings/components/GuestActionCard", () => ({
	GuestActionCard: () => null,
}));

jest.mock("@/screens/Settings/components/AuthenticatedActions", () => ({
	AuthenticatedActions: () => null,
}));

jest.mock("@/hooks/useAIStatus", () => ({
	useAIStatus: () => ({ status: "unavailable", lastCheckedAt: null, refresh: jest.fn() }),
}));

jest.mock("@/services/database", () => {
	return {
		getPreferenceValue: jest.fn().mockResolvedValue("false"),
		setPreferenceValue: jest.fn().mockResolvedValue(undefined),
	};
});

describe("SettingsScreen", () => {
	const baseProps = {
		onLogout: jest.fn(),
		canLogout: true,
		isGuest: false,
		onRequestLogin: jest.fn(),
		onRequestSignUp: jest.fn(),
		onShowOnboarding: jest.fn(),
		appVersion: "1.0.0",
		profileDisplayName: "Alex",
		profileUsername: "alex",
		onNavigateProfile: jest.fn(),
		onNavigateAccountDeletion: jest.fn(),
		onExportBackup: jest.fn(),
		onImportBackup: jest.fn(),
		themeMode: "light" as const,
		fontScale: 1,
		onNavigateThemeSettings: jest.fn(),
		onNavigateFontSettings: jest.fn(),
	};

	beforeEach(() => {
		jest.clearAllMocks();
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it("opens mail composer when contact card pressed", async () => {
		jest.spyOn(Linking, "canOpenURL").mockResolvedValue(true);
		jest.spyOn(Linking, "openURL").mockResolvedValue();

		const { getByText } = render(<SettingsScreen {...baseProps} />);

		await act(async () => {
			fireEvent.press(getByText("1:1 문의 보내기"));
		});

		expect(Linking.canOpenURL).toHaveBeenCalled();
		expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining("mailto:support@vocationary.app"));
	});

	it("shows alert when mail composer unavailable", async () => {
		jest.spyOn(Linking, "canOpenURL").mockResolvedValue(false);
		const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});

		const { getByText } = render(<SettingsScreen {...baseProps} />);

		await act(async () => {
			fireEvent.press(getByText("1:1 문의 보내기"));
		});

		expect(alertSpy).toHaveBeenCalledWith("문의하기", expect.stringContaining("support@vocationary.app"));
	});

	it("displays profile displayName and username subtitle", () => {
		const { getByText } = render(<SettingsScreen {...baseProps} profileDisplayName="Alex Kim" profileUsername="alexkim" />);

		expect(getByText("Alex Kim")).toBeTruthy();
		expect(getByText("@alexkim")).toBeTruthy();
	});

	it("falls back to username and guest subtitle", () => {
		const props = { ...baseProps, profileDisplayName: null, profileUsername: "john" };
		const { getByText } = render(<SettingsScreen {...props} isGuest />);

		expect(getByText("john")).toBeTruthy();
		expect(getByText("게스트 모드")).toBeTruthy();
	});

	it("navigates to theme settings when preference tapped", () => {
		const { getByText } = render(<SettingsScreen {...baseProps} />);

		fireEvent.press(getByText("화면 모드"));
		expect(baseProps.onNavigateThemeSettings).toHaveBeenCalled();
	});

	it("navigates to font settings when preference tapped", () => {
		const { getByText } = render(<SettingsScreen {...baseProps} />);

		fireEvent.press(getByText("글자 크기"));
		expect(baseProps.onNavigateFontSettings).toHaveBeenCalled();
	});
});
