import { createNativeStackNavigator, type NativeStackNavigationOptions } from "@react-navigation/native-stack";
import React from "react";

import { SettingsHeader } from "@/screens/Settings/components/SettingsHeader";
import { DeleteAccountScreen } from "@/screens/Settings/DeleteAccountScreen";
import { FontSizeScreen } from "@/screens/Settings/FontSizeScreen";
import { MyPageNicknameScreen } from "@/screens/Settings/MyPageNicknameScreen";
import { MyPagePasswordScreen } from "@/screens/Settings/MyPagePasswordScreen";
import { MyPageScreen } from "@/screens/Settings/MyPageScreen";
import { RecoveryGuideScreen } from "@/screens/Settings/RecoveryGuideScreen";
import { SettingsNavigatorProps, SettingsStackParamList } from "@/screens/Settings/SettingsNavigator.types";
import { SettingsScreen } from "@/screens/Settings/SettingsScreen";
import { ThemeModeScreen } from "@/screens/Settings/ThemeModeScreen";
import { useAppAppearance } from "@/theme/AppearanceContext";

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export function SettingsNavigator({
    onLogout,
    canLogout,
    isGuest,
    onRequestLogin,
    onRequestSignUp,
    appVersion,
    profileDisplayName,
    profileUsername,
    onUpdateProfile,
    onCheckDisplayName,
    onUpdatePassword,
    onDeleteAccount,
    onExportBackup,
    onImportBackup,
    onShowOnboarding,
    themeMode,
    onThemeModeChange,
    fontScale,
    onFontScaleChange,
}: SettingsNavigatorProps) {
    const { theme } = useAppAppearance();
    const baseHeaderOptions = React.useMemo<NativeStackNavigationOptions>(
        () => ({
            contentStyle: { backgroundColor: theme.background },
            headerShadowVisible: false,
            navigationBarColor: theme.background,
            header: (props) => <SettingsHeader {...props} />,
        }),
        [theme.background],
    );

    const settingsHomeOptions = React.useMemo<NativeStackNavigationOptions>(
        () => ({ headerShown: false, title: "설정" }),
        [],
    );
    const myPageOptions = React.useMemo<NativeStackNavigationOptions>(
        () => ({
            title: "마이 페이지",
            headerBackTitle: "",
            headerBackButtonDisplayMode: "minimal",
        }),
        [],
    );
    const myPageNicknameOptions = React.useMemo<NativeStackNavigationOptions>(
        () => ({
            title: "닉네임 설정",
            headerBackButtonDisplayMode: "minimal",
        }),
        [],
    );
    const myPagePasswordOptions = React.useMemo<NativeStackNavigationOptions>(
        () => ({
            title: "비밀번호 변경",
            headerBackButtonDisplayMode: "minimal",
        }),
        [],
    );
    const themeModeOptions = React.useMemo<NativeStackNavigationOptions>(
        () => ({
            title: "화면 모드",
            headerBackButtonDisplayMode: "minimal",
        }),
        [],
    );
    const fontSizeOptions = React.useMemo<NativeStackNavigationOptions>(
        () => ({
            title: "글자 크기",
            headerBackButtonDisplayMode: "minimal",
        }),
        [],
    );
    const deleteAccountOptions = React.useMemo<NativeStackNavigationOptions>(
        () => ({
            title: "회원탈퇴",
            headerBackButtonDisplayMode: "minimal",
        }),
        [],
    );
    const recoveryGuideOptions = React.useMemo<NativeStackNavigationOptions>(
        () => ({
            title: "계정 복구 안내",
            headerBackButtonDisplayMode: "minimal",
        }),
        [],
    );
    return (
        <Stack.Navigator screenOptions={baseHeaderOptions}>
            <Stack.Screen name="SettingsHome" options={settingsHomeOptions}>
                {({ navigation }) => (
                    <SettingsScreen
                        onLogout={onLogout}
                        canLogout={canLogout}
                        isGuest={isGuest}
                        onRequestLogin={onRequestLogin}
                        onRequestSignUp={onRequestSignUp}
                        onShowOnboarding={onShowOnboarding}
                        appVersion={appVersion}
                        profileDisplayName={profileDisplayName}
                        profileUsername={profileUsername}
                        onNavigateProfile={() => {
                            navigation.navigate("MyPage");
                        }}
                        onNavigateAccountDeletion={() => {
                            navigation.navigate("DeleteAccount");
                        }}
                        onExportBackup={onExportBackup}
                        onImportBackup={onImportBackup}
                        themeMode={themeMode}
                        fontScale={fontScale}
                        onNavigateThemeSettings={() => {
                            navigation.navigate("ThemeModeSettings");
                        }}
                        onNavigateFontSettings={() => {
                            navigation.navigate("FontSizeSettings");
                        }}
                        onNavigateRecoveryGuide={() => {
                            navigation.navigate("RecoveryGuide");
                        }}
                    />
                )}
            </Stack.Screen>
            <Stack.Screen name="MyPage" options={myPageOptions}>
                {({ navigation }) => (
                    <MyPageScreen
                        username={profileUsername ?? ""}
                        displayName={profileDisplayName}
                        onNavigateNickname={() => {
                            navigation.navigate("MyPageNickname");
                        }}
                        onNavigatePassword={() => {
                            navigation.navigate("MyPagePassword");
                        }}
                        onNavigateDeleteAccount={() => {
                            navigation.navigate("DeleteAccount");
                        }}
                    />
                )}
            </Stack.Screen>
            <Stack.Screen name="MyPageNickname" options={myPageNicknameOptions}>
                {({ navigation }) => (
                    <MyPageNicknameScreen
                        username={profileUsername ?? ""}
                        displayName={profileDisplayName}
                        onUpdateProfile={onUpdateProfile}
                        onCheckNickname={onCheckDisplayName}
                        onGoBack={() => {
                            navigation.goBack();
                        }}
                    />
                )}
            </Stack.Screen>
            <Stack.Screen name="MyPagePassword" options={myPagePasswordOptions}>
                {({ navigation }) => (
                    <MyPagePasswordScreen
                        username={profileUsername ?? ""}
                        onUpdatePassword={onUpdatePassword}
                        onGoBack={() => {
                            navigation.goBack();
                        }}
                    />
                )}
            </Stack.Screen>
            <Stack.Screen name="ThemeModeSettings" options={themeModeOptions}>
                {() => <ThemeModeScreen themeMode={themeMode} onChangeThemeMode={onThemeModeChange} />}
            </Stack.Screen>
            <Stack.Screen name="FontSizeSettings" options={fontSizeOptions}>
                {() => <FontSizeScreen fontScale={fontScale} onChangeFontScale={onFontScaleChange} />}
            </Stack.Screen>
            <Stack.Screen name="DeleteAccount" options={deleteAccountOptions}>
                {({ navigation }) => (
                    <DeleteAccountScreen
                        onDeleteAccount={onDeleteAccount}
                        onComplete={() => {
                            try {
                                if (navigation.canGoBack()) {
                                    navigation.popToTop();
                                }
                            } catch {
                                // Navigator may have unmounted after account deletion; safe to ignore.
                            }
                        }}
                    />
                )}
            </Stack.Screen>
            <Stack.Screen name="RecoveryGuide" options={recoveryGuideOptions} component={RecoveryGuideScreen} />
        </Stack.Navigator>
    );
}
