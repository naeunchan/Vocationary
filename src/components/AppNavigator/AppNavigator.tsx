import {
    DarkTheme as NavigationDarkTheme,
    DefaultTheme as NavigationDefaultTheme,
    NavigationContainer,
} from "@react-navigation/native";
import React, { useMemo } from "react";

import { AppNavigatorProps } from "@/components/AppNavigator/AppNavigator.types";
import { RootTabNavigator } from "@/navigation/RootTabNavigator";
import { useAppAppearance } from "@/theme/AppearanceContext";

export function AppNavigator(props: AppNavigatorProps) {
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

    return (
        <NavigationContainer independent theme={navigationTheme}>
            <RootTabNavigator {...props} />
        </NavigationContainer>
    );
}
