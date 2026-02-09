import { act, fireEvent, render } from "@testing-library/react-native";
import React from "react";
import { Linking } from "react-native";

import { RecoveryGuideScreen } from "@/screens/Settings/RecoveryGuideScreen";

describe("RecoveryGuideScreen", () => {
    beforeEach(() => {
        jest.clearAllMocks();
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
});
