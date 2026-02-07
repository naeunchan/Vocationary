import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

export type SignupState = {
    email: string;
    name: string;
    phone: string;
    password: string;
    passwordConfirm: string;
};

type SignupContextValue = {
    state: SignupState;
    setState: (next: SignupState) => void;
    updateState: (partial: Partial<SignupState>) => void;
    reset: () => void;
    resetCount: number;
};

const DEFAULT_STATE: SignupState = {
    email: "",
    name: "",
    phone: "",
    password: "",
    passwordConfirm: "",
};

const SignupContext = createContext<SignupContextValue | null>(null);

type SignupProviderProps = {
    children: React.ReactNode;
};

export function SignupProvider({ children }: SignupProviderProps) {
    const [state, setStateValue] = useState<SignupState>(DEFAULT_STATE);
    const [resetCount, setResetCount] = useState(0);

    const setState = useCallback((next: SignupState) => {
        setStateValue(next);
    }, []);

    const updateState = useCallback((partial: Partial<SignupState>) => {
        setStateValue((current) => ({ ...current, ...partial }));
    }, []);

    const reset = useCallback(() => {
        setStateValue(DEFAULT_STATE);
        setResetCount((count) => count + 1);
    }, []);

    const value = useMemo<SignupContextValue>(
        () => ({
            state,
            setState,
            updateState,
            reset,
            resetCount,
        }),
        [reset, resetCount, setState, state, updateState],
    );

    return <SignupContext.Provider value={value}>{children}</SignupContext.Provider>;
}

export function useSignupStore() {
    const context = useContext(SignupContext);
    if (!context) {
        throw new Error("useSignupStore must be used within SignupProvider");
    }
    return context;
}

export const signupDefaultState = DEFAULT_STATE;
