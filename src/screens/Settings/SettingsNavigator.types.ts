import type { ThemeMode } from "@/theme/types";

export type SettingsStackParamList = {
    SettingsHome: undefined;
    MyPage: undefined;
    MyPageNickname: undefined;
    MyPagePassword: undefined;
    RecoveryGuide: undefined;
    ThemeModeSettings: undefined;
    FontSizeSettings: undefined;
    DeleteAccount: undefined;
};

export type SettingsNavigatorProps = {
    onLogout: () => void;
    canLogout: boolean;
    isGuest: boolean;
    onRequestLogin: () => void;
    onRequestSignUp: () => void;
    appVersion: string;
    profileDisplayName: string | null;
    profileUsername: string | null;
    onUpdateProfile: (displayName: string) => Promise<void>;
    onCheckDisplayName: (displayName: string) => Promise<string>;
    onUpdatePassword: (password: string) => Promise<void>;
    onDeleteAccount: () => Promise<void>;
    onExportBackup: (passphrase: string) => Promise<void>;
    onImportBackup: (passphrase: string) => Promise<void>;
    onShowOnboarding: () => void;
    themeMode: ThemeMode;
    onThemeModeChange: (mode: ThemeMode) => void;
    fontScale: number;
    onFontScaleChange: (scale: number) => void;
};
