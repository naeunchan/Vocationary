import { act, fireEvent, render } from "@testing-library/react-native";
import React from "react";
import { Alert, Linking } from "react-native";

import { FEATURE_FLAGS } from "@/config/featureFlags";
import { SettingsScreen } from "@/screens/Settings/SettingsScreen";

jest.mock("@expo/vector-icons/Ionicons", () => {
    const React = require("react");
    const { Text } = require("react-native");
    return (props: { name: string }) => <Text>{props.name}</Text>;
});

jest.mock("@/screens/Settings/components/GuestActionCard", () => ({
    GuestActionCard: ({ onSignUp, onLogin }: { onSignUp: () => void; onLogin: () => void }) => {
        const React = require("react");
        const { Text, TouchableOpacity, View } = require("react-native");
        return (
            <View>
                <TouchableOpacity onPress={onSignUp}>
                    <Text>회원가입 후 계속하기</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onLogin}>
                    <Text>기존 계정으로 로그인</Text>
                </TouchableOpacity>
            </View>
        );
    },
}));

jest.mock("@/screens/Settings/components/AuthenticatedActions", () => ({
    AuthenticatedActions: ({
        onNavigateNickname,
        onNavigatePassword,
    }: {
        onNavigateNickname: () => void;
        onNavigatePassword: () => void;
    }) => {
        const React = require("react");
        const { Text, TouchableOpacity, View } = require("react-native");
        return (
            <View>
                <TouchableOpacity onPress={onNavigateNickname}>
                    <Text>닉네임 설정</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onNavigatePassword}>
                    <Text>비밀번호 변경</Text>
                </TouchableOpacity>
            </View>
        );
    },
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
        onNavigateNickname: jest.fn(),
        onNavigatePassword: jest.fn(),
        onNavigateAccountDeletion: jest.fn(),
        onExportBackup: jest.fn(),
        onImportBackup: jest.fn(),
        themeMode: "light" as const,
        fontScale: 1,
        onNavigateThemeSettings: jest.fn(),
        onNavigateFontSettings: jest.fn(),
        dailyGoalSettings: {
            enabled: false,
            targetCount: 10,
            updatedAt: null,
        },
        dailyGoalProgress: {
            completedCount: 0,
            targetCount: 10,
            remainingCount: 10,
            isComplete: false,
        },
        reviewStreak: {
            currentStreak: 0,
            longestStreak: 0,
            lastCompletedDate: null,
        },
        reviewReminderSettings: {
            enabled: false,
            hour: 20,
            minute: 0,
            weekdays: [1, 2, 3, 4, 5, 6, 0],
            updatedAt: null,
        },
        nextReminderLabel: null,
        onToggleDailyGoal: jest.fn(),
        onSelectDailyGoalTarget: jest.fn(),
        onToggleReviewReminder: jest.fn(),
        onSelectReviewReminderTime: jest.fn(),
        onToggleReviewReminderWeekday: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        FEATURE_FLAGS.accountAuth = true;
        FEATURE_FLAGS.backupRestore = false;
        FEATURE_FLAGS.guestAccountCta = true;
        FEATURE_FLAGS.dailyGoal = false;
        FEATURE_FLAGS.reviewReminder = false;
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
        expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining("mailto:support@vocachip.app"));
        expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining(encodeURIComponent("계정: alex")));
        expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining(encodeURIComponent("앱 버전: 1.0.0")));
    });

    it("shows alert when mail composer unavailable", async () => {
        jest.spyOn(Linking, "canOpenURL").mockResolvedValue(false);
        const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});

        const { getByText } = render(<SettingsScreen {...baseProps} />);

        await act(async () => {
            fireEvent.press(getByText("1:1 문의 보내기"));
        });

        expect(alertSpy).toHaveBeenCalledWith("문의하기", expect.stringContaining("support@vocachip.app"));
    });

    it("displays profile displayName and username subtitle", () => {
        const { getByText } = render(
            <SettingsScreen {...baseProps} profileDisplayName="Alex Kim" profileUsername="alexkim" />,
        );

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

    it("opens the backup modal, validates passphrase, and exports with trimmed input", async () => {
        FEATURE_FLAGS.backupRestore = true;
        const onExportBackup = jest.fn().mockResolvedValue(undefined);
        const { getByPlaceholderText, getByText, queryByText } = render(
            <SettingsScreen {...baseProps} onExportBackup={onExportBackup} />,
        );

        fireEvent.press(getByText("데이터 백업 내보내기"));
        expect(getByText("백업 내보내기")).toBeTruthy();

        await act(async () => {
            fireEvent.press(getByText("확인"));
        });
        expect(getByText("암호를 입력해주세요.")).toBeTruthy();

        fireEvent.changeText(getByPlaceholderText("암호 입력"), " secret ");
        expect(queryByText("암호를 입력해주세요.")).toBeNull();

        await act(async () => {
            fireEvent.press(getByText("확인"));
        });
        expect(onExportBackup).toHaveBeenCalledWith("secret");
    });

    it("hides guest account section when guest account cta is disabled", () => {
        FEATURE_FLAGS.guestAccountCta = false;
        const { queryByText } = render(<SettingsScreen {...baseProps} isGuest />);

        expect(queryByText("회원가입 후 계속하기")).toBeNull();
        expect(queryByText("기존 계정으로 로그인")).toBeNull();
        expect(queryByText("계정")).toBeNull();
    });

    it("hides guest account section when account auth is disabled", () => {
        FEATURE_FLAGS.accountAuth = false;
        const { queryByText, getByText } = render(<SettingsScreen {...baseProps} isGuest />);

        expect(queryByText("회원가입 후 계속하기")).toBeNull();
        expect(queryByText("기존 계정으로 로그인")).toBeNull();
        expect(queryByText("계정")).toBeNull();
        expect(getByText("법적 고지 및 정보")).toBeTruthy();
    });

    it("navigates directly to nickname settings from account section", () => {
        const { getByText } = render(<SettingsScreen {...baseProps} />);

        fireEvent.press(getByText("닉네임 설정"));
        expect(baseProps.onNavigateNickname).toHaveBeenCalled();
    });

    it("navigates directly to password settings from account section", () => {
        const { getByText } = render(<SettingsScreen {...baseProps} />);

        fireEvent.press(getByText("비밀번호 변경"));
        expect(baseProps.onNavigatePassword).toHaveBeenCalled();
    });

    it("renders goal and reminder controls when the study management flags are enabled", () => {
        FEATURE_FLAGS.dailyGoal = true;
        FEATURE_FLAGS.reviewReminder = true;

        const props = {
            ...baseProps,
            reviewReminderSettings: {
                ...baseProps.reviewReminderSettings,
                enabled: true,
            },
            nextReminderLabel: "오후 8:00",
        };

        const { getByLabelText, getByText } = render(<SettingsScreen {...props} />);

        expect(getByText("학습 관리")).toBeTruthy();

        fireEvent.press(getByLabelText("오늘 목표 켜기"));
        expect(baseProps.onToggleDailyGoal).toHaveBeenCalledWith(true);

        fireEvent.press(getByLabelText("20개 목표 선택"));
        expect(baseProps.onSelectDailyGoalTarget).toHaveBeenCalledWith(20);

        fireEvent.press(getByLabelText("오후 9:00 알림 시간 선택"));
        expect(baseProps.onSelectReviewReminderTime).toHaveBeenCalledWith(21, 0);

        fireEvent.press(getByLabelText("월요일 알림 토글"));
        expect(baseProps.onToggleReviewReminderWeekday).toHaveBeenCalledWith(1);
    });
});
