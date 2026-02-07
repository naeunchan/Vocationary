import { scaleFont } from "@/theme/utils";

export const createTypography = (fontScale: number) => ({
    title: {
        fontSize: scaleFont(28, fontScale),
        fontWeight: "800" as const,
    },
    subtitle: {
        fontSize: scaleFont(16, fontScale),
        fontWeight: "600" as const,
    },
    body: {
        fontSize: scaleFont(15, fontScale),
        fontWeight: "500" as const,
    },
    caption: {
        fontSize: scaleFont(12, fontScale),
        fontWeight: "500" as const,
    },
});
