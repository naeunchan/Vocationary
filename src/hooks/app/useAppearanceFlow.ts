import { useCallback, useEffect, useState } from "react";

import { getPreferenceValue, setPreferenceValue } from "@/services/database";
import {
    DEFAULT_FONT_SCALE,
    FONT_SCALE_PREFERENCE_KEY,
    GUEST_USED_PREFERENCE_KEY,
    ONBOARDING_PREFERENCE_KEY,
    THEME_MODE_PREFERENCE_KEY,
} from "@/theme/constants";
import type { ThemeMode } from "@/theme/types";

type UseAppearanceFlowResult = {
    themeMode: ThemeMode;
    fontScale: number;
    appearanceReady: boolean;
    isOnboardingVisible: boolean;
    setOnboardingVisible: (visible: boolean) => void;
    onThemeModeChange: (mode: ThemeMode) => void;
    onFontScaleChange: (scale: number) => void;
    onShowOnboarding: () => void;
    onCompleteOnboarding: () => void;
    syncOnboardingVisibilityAfterAuthentication: () => Promise<void>;
};

export function useAppearanceFlow(): UseAppearanceFlowResult {
    const [themeMode, setThemeMode] = useState<ThemeMode>("light");
    const [fontScale, setFontScale] = useState(DEFAULT_FONT_SCALE);
    const [appearanceReady, setAppearanceReady] = useState(false);
    const [isOnboardingVisible, setIsOnboardingVisible] = useState(false);

    useEffect(() => {
        let isMounted = true;

        async function loadAppearancePreferences() {
            try {
                const [storedMode, storedScale] = await Promise.all([
                    getPreferenceValue(THEME_MODE_PREFERENCE_KEY),
                    getPreferenceValue(FONT_SCALE_PREFERENCE_KEY),
                ]);

                if (storedMode === "dark" || storedMode === "light") {
                    setThemeMode(storedMode);
                }

                if (storedScale) {
                    const parsed = Number(storedScale);
                    if (Number.isFinite(parsed) && parsed >= 0.85 && parsed <= 1.3) {
                        setFontScale(parsed);
                    }
                }
            } catch (error) {
                console.warn("모양새 설정을 불러오는 중 문제가 발생했어요.", error);
            } finally {
                if (isMounted) {
                    setAppearanceReady(true);
                }
            }
        }

        void loadAppearancePreferences();

        return () => {
            isMounted = false;
        };
    }, []);

    const onThemeModeChange = useCallback((nextMode: ThemeMode) => {
        setThemeMode(nextMode);
        void setPreferenceValue(THEME_MODE_PREFERENCE_KEY, nextMode).catch((error) => {
            console.warn("테마 설정을 저장하는 중 문제가 발생했어요.", error);
        });
    }, []);

    const onFontScaleChange = useCallback((scale: number) => {
        const clamped = Math.min(Math.max(scale, 0.85), 1.3);
        setFontScale(clamped);
        void setPreferenceValue(FONT_SCALE_PREFERENCE_KEY, clamped.toString()).catch((error) => {
            console.warn("글자 크기를 저장하는 중 문제가 발생했어요.", error);
        });
    }, []);

    const onShowOnboarding = useCallback(() => {
        setIsOnboardingVisible(true);
        void setPreferenceValue(ONBOARDING_PREFERENCE_KEY, "false").catch((error) => {
            console.warn("온보딩 상태를 업데이트하는 중 문제가 발생했어요.", error);
        });
    }, []);

    const onCompleteOnboarding = useCallback(() => {
        setIsOnboardingVisible(false);
        void setPreferenceValue(ONBOARDING_PREFERENCE_KEY, "true").catch((error) => {
            console.warn("온보딩 상태를 저장하는 중 문제가 발생했어요.", error);
        });
    }, []);

    const syncOnboardingVisibilityAfterAuthentication = useCallback(async () => {
        try {
            const [onboardingValue, guestUsedValue] = await Promise.all([
                getPreferenceValue(ONBOARDING_PREFERENCE_KEY),
                getPreferenceValue(GUEST_USED_PREFERENCE_KEY),
            ]);
            if (guestUsedValue === "true") {
                setIsOnboardingVisible(false);
                await setPreferenceValue(ONBOARDING_PREFERENCE_KEY, "true");
                return;
            }

            setIsOnboardingVisible(onboardingValue !== "true");
        } catch (error) {
            console.warn("온보딩 상태를 불러오는 중 문제가 발생했어요.", error);
            setIsOnboardingVisible(true);
        }
    }, []);

    const setOnboardingVisible = useCallback((visible: boolean) => {
        setIsOnboardingVisible(visible);
    }, []);

    return {
        themeMode,
        fontScale,
        appearanceReady,
        isOnboardingVisible,
        setOnboardingVisible,
        onThemeModeChange,
        onFontScaleChange,
        onShowOnboarding,
        onCompleteOnboarding,
        syncOnboardingVisibilityAfterAuthentication,
    };
}
