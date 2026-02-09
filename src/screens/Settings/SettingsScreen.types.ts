import type { ThemeMode } from "@/theme/types";

export type SettingsScreenProps = {
    onLogout: () => void;
    canLogout: boolean;
    isGuest: boolean;
    onRequestLogin: () => void;
    onRequestSignUp: () => void;
    onShowOnboarding: () => void;
    appVersion: string;
    profileDisplayName: string | null;
    profileUsername: string | null;
    onNavigateProfile: () => void;
    onNavigateAccountDeletion: () => void;
    onExportBackup: (passphrase: string) => Promise<void>;
    onImportBackup: (passphrase: string) => Promise<void>;
    themeMode: ThemeMode;
    fontScale: number;
    onNavigateThemeSettings: () => void;
    onNavigateFontSettings: () => void;
    onNavigateRecoveryGuide: () => void;
};
