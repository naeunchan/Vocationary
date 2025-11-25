import type { LoginScreenProps } from "@/screens/Auth/LoginScreen.types";
import type { RootTabNavigatorProps } from "@/navigation/RootTabNavigator.types";
import type { ThemeMode } from "@/theme/types";

export type AppScreenHookResult = {
	versionLabel: string;
	initializing: boolean;
	appearanceReady: boolean;
	isHelpVisible: boolean;
	isOnboardingVisible: boolean;
	isAuthenticated: boolean;
	loginBindings: LoginScreenProps;
	navigatorProps: RootTabNavigatorProps;
	handleDismissHelp: () => void;
	onShowOnboarding: () => void;
	onCompleteOnboarding: () => void;
	themeMode: ThemeMode;
	fontScale: number;
	onThemeModeChange: (mode: ThemeMode) => void;
	onFontScaleChange: (scale: number) => void;
};
