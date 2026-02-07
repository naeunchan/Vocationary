import type { ThemeMode } from "@/theme/types";

export const THEME_MODE_PREFERENCE_KEY = "settings.theme.mode";
export const FONT_SCALE_PREFERENCE_KEY = "settings.font.scale";
export const ONBOARDING_PREFERENCE_KEY = "experience.onboarding.seen";
export const GUEST_USED_PREFERENCE_KEY = "experience.guest.used";
export const BIOMETRIC_LOGIN_PREFERENCE_KEY = "settings.auth.biometric";

export const THEME_MODE_OPTIONS: { label: string; value: ThemeMode }[] = [
    { label: "라이트", value: "light" },
    { label: "다크", value: "dark" },
];

export const FONT_SCALE_OPTIONS = [
    { label: "작게", value: 0.9 },
    { label: "기본", value: 1 },
    { label: "크게", value: 1.15 },
] as const;

export const DEFAULT_FONT_SCALE = 1;
