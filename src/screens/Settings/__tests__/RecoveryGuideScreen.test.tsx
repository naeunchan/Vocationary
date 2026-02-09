import { act, fireEvent, render } from "@testing-library/react-native";
import React from "react";
import { Linking } from "react-native";

import { FEATURE_FLAGS } from "@/config/featureFlags";
import { RecoveryGuideScreen } from "@/screens/Settings/RecoveryGuideScreen";

jest.mock("@/config/featureFlags", () => ({
    FEATURE_FLAGS: {
        guestAccountCta: false,
        backupRestore: false,
        biometricAutoLogin: false,
    },
}));

describe("RecoveryGuideScreen", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        FEATURE_FLAGS.backupRestore = false;
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("opens mail composer when support action is pressed", async () => {
        jest.spyOn(Linking, "canOpenURL").mockResolvedValue(true);
        jest.spyOn(Linking, "openURL").mockResolvedValue();

        const { getByText } = render(<RecoveryGuideScreen />);

        await act(async () => {
            fireEvent.press(getByText("고객센터 문의하기"));
        });

        expect(Linking.canOpenURL).toHaveBeenCalled();
        expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining("mailto:support@vocationary.app"));
    });

    it("renders shortcut actions and triggers callbacks in auth context", () => {
        const onRequestSignUp = jest.fn();
        const onContinueAsGuest = jest.fn();
        const { getByText } = render(
            <RecoveryGuideScreen onRequestSignUp={onRequestSignUp} onContinueAsGuest={onContinueAsGuest} />,
        );

        fireEvent.press(getByText("새 계정 만들기"));
        fireEvent.press(getByText("게스트로 계속하기"));

        expect(onRequestSignUp).toHaveBeenCalled();
        expect(onContinueAsGuest).toHaveBeenCalled();
    });

    it("hides backup restore path copy when backupRestore flag is disabled", () => {
        const { queryByText, getByText } = render(<RecoveryGuideScreen />);

        expect(queryByText(/백업 및 복원/)).toBeNull();
        expect(getByText("3. 기존 계정 데이터가 필요한 경우 고객센터로 문의하기")).toBeTruthy();
    });

    it("shows backup restore path copy when backupRestore flag is enabled", () => {
        FEATURE_FLAGS.backupRestore = true;
        const { getByText } = render(<RecoveryGuideScreen />);

        expect(getByText(/설정 > 백업 및 복원 > 백업에서 복원하기/)).toBeTruthy();
        expect(getByText("4. 기존 계정 데이터가 필요한 경우 고객센터로 문의하기")).toBeTruthy();
    });
});
