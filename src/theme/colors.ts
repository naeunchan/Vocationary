import type { AppThemeColors } from "@/theme/types";

export type SignupColors = {
    background: string;
    surface: string;
    text: string;
    muted: string;
    primary: string;
    danger: string;
    border: string;
};

export function getSignupColors(theme: AppThemeColors): SignupColors {
    return {
        background: theme.background,
        surface: theme.surface,
        text: theme.textPrimary,
        muted: theme.textSecondary,
        primary: theme.accent,
        danger: theme.danger,
        border: theme.inputBorder,
    };
}
