import React, { useMemo } from "react";
import { DarkTheme as NavigationDarkTheme, DefaultTheme as NavigationDefaultTheme, NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator, type NativeStackNavigationOptions } from "@react-navigation/native-stack";
import { LoginScreen } from "@/screens/Auth/LoginScreen";
import { AuthNavigatorProps, AuthStackParamList } from "@/screens/Auth/AuthNavigator.types";
import { useAppAppearance } from "@/theme/AppearanceContext";

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator({ loginProps }: AuthNavigatorProps) {
	const { mode, theme } = useAppAppearance();
	const navigationTheme = useMemo(
		() => ({
			...(mode === "dark" ? NavigationDarkTheme : NavigationDefaultTheme),
			colors: {
				...(mode === "dark" ? NavigationDarkTheme.colors : NavigationDefaultTheme.colors),
				background: theme.background,
				card: theme.surface,
				border: theme.border,
				primary: theme.textPrimary,
				text: theme.textPrimary,
			},
		}),
		[mode, theme],
	);
	const stackScreenOptions = useMemo<NativeStackNavigationOptions>(
		() => ({
			contentStyle: { backgroundColor: theme.background },
			headerStyle: { backgroundColor: theme.background },
			headerTintColor: theme.textPrimary,
			headerTitleStyle: { color: theme.textPrimary },
		}),
		[theme.background, theme.textPrimary],
	);

	return (
		<NavigationContainer independent theme={navigationTheme}>
			<Stack.Navigator screenOptions={stackScreenOptions}>
				<Stack.Screen name="Login" options={{ headerShown: false }}>
					{() => <LoginScreen {...loginProps} />}
				</Stack.Screen>
			</Stack.Navigator>
		</NavigationContainer>
	);
}
