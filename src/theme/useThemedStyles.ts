import { useMemo } from "react";

import { useAppAppearance } from "@/theme/AppearanceContext";
import type { AppThemeColors } from "@/theme/types";

export function useThemedStyles<T>(factory: (theme: AppThemeColors, fontScale: number) => T) {
    const { theme, fontScale } = useAppAppearance();
    return useMemo(() => factory(theme, fontScale), [factory, fontScale, theme]);
}
