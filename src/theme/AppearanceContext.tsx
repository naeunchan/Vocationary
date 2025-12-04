import React, { createContext, useContext, useMemo } from "react";

import { APP_THEMES } from "@/theme/themes";
import type { AppThemeColors, ThemeMode } from "@/theme/types";

type AppearanceContextValue = {
    mode: ThemeMode;
    theme: AppThemeColors;
    fontScale: number;
    setMode: (mode: ThemeMode) => void;
    setFontScale: (scale: number) => void;
};

const defaultValue: AppearanceContextValue = {
    mode: "light",
    theme: APP_THEMES.light,
    fontScale: 1,
    setMode: () => undefined,
    setFontScale: () => undefined,
};

const AppearanceContext = createContext<AppearanceContextValue>(defaultValue);

type AppearanceProviderProps = {
    mode: ThemeMode;
    fontScale: number;
    onChangeMode: (mode: ThemeMode) => void;
    onChangeFontScale: (scale: number) => void;
    children: React.ReactNode;
};

export function AppAppearanceProvider({
    mode,
    fontScale,
    onChangeMode,
    onChangeFontScale,
    children,
}: AppearanceProviderProps) {
    const value = useMemo<AppearanceContextValue>(
        () => ({
            mode,
            theme: APP_THEMES[mode],
            fontScale,
            setMode: onChangeMode,
            setFontScale: onChangeFontScale,
        }),
        [fontScale, mode, onChangeFontScale, onChangeMode],
    );

    return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

export function useAppAppearance() {
    return useContext(AppearanceContext);
}
