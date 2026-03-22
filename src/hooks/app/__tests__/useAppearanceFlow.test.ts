import { act, renderHook, waitFor } from "@testing-library/react-native";

import { useAppearanceFlow } from "@/hooks/app/useAppearanceFlow";
import * as database from "@/services/database";
import {
    FONT_SCALE_PREFERENCE_KEY,
    GUEST_USED_PREFERENCE_KEY,
    ONBOARDING_PREFERENCE_KEY,
    THEME_MODE_PREFERENCE_KEY,
} from "@/theme/constants";

jest.mock("@/services/database", () => ({
    getPreferenceValue: jest.fn(),
    setPreferenceValue: jest.fn(),
}));

const mockGetPreferenceValue = database.getPreferenceValue as jest.MockedFunction<typeof database.getPreferenceValue>;
const mockSetPreferenceValue = database.setPreferenceValue as jest.MockedFunction<typeof database.setPreferenceValue>;

describe("useAppearanceFlow", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetPreferenceValue.mockResolvedValue(null);
        mockSetPreferenceValue.mockResolvedValue(undefined);
    });

    it("loads stored theme and font scale preferences", async () => {
        mockGetPreferenceValue.mockImplementation(async (key: string) => {
            if (key === THEME_MODE_PREFERENCE_KEY) {
                return "dark";
            }
            if (key === FONT_SCALE_PREFERENCE_KEY) {
                return "1.15";
            }
            return null;
        });

        const { result } = renderHook(() => useAppearanceFlow());

        await waitFor(() => {
            expect(result.current.appearanceReady).toBe(true);
        });

        expect(result.current.themeMode).toBe("dark");
        expect(result.current.fontScale).toBe(1.15);
    });

    it("shows onboarding and persists the pending state", async () => {
        const { result } = renderHook(() => useAppearanceFlow());

        await waitFor(() => {
            expect(result.current.appearanceReady).toBe(true);
        });

        act(() => {
            result.current.onShowOnboarding();
        });

        expect(result.current.isOnboardingVisible).toBe(true);
        expect(mockSetPreferenceValue).toHaveBeenCalledWith(ONBOARDING_PREFERENCE_KEY, "false");
    });

    it("keeps onboarding hidden after guest conversion and marks it complete", async () => {
        mockGetPreferenceValue.mockImplementation(async (key: string) => {
            if (key === GUEST_USED_PREFERENCE_KEY) {
                return "true";
            }
            if (key === ONBOARDING_PREFERENCE_KEY) {
                return "false";
            }
            return null;
        });

        const { result } = renderHook(() => useAppearanceFlow());

        await waitFor(() => {
            expect(result.current.appearanceReady).toBe(true);
        });

        await act(async () => {
            await result.current.syncOnboardingVisibilityAfterAuthentication();
        });

        expect(result.current.isOnboardingVisible).toBe(false);
        expect(mockSetPreferenceValue).toHaveBeenCalledWith(ONBOARDING_PREFERENCE_KEY, "true");
    });
});
