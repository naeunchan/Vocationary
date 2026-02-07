import { zodResolver } from "@hookform/resolvers/zod";
import React, { useEffect, useMemo, useRef } from "react";
import { FormProvider, useForm } from "react-hook-form";

import { type SignupFormValues, signupSchema } from "@/screens/Auth/signup/signupSchema";
import { useSignupStore } from "@/store/signupStore";

type SignUpFormProviderProps = {
    children: React.ReactNode;
};

export function SignUpFormProvider({ children }: SignUpFormProviderProps) {
    const { state, setState, resetCount } = useSignupStore();

    const defaultValues = useMemo<SignupFormValues>(
        () => ({
            email: state.email,
            name: state.name,
            phone: state.phone,
            password: state.password,
            passwordConfirm: state.passwordConfirm,
        }),
        [state.email, state.name, state.password, state.passwordConfirm, state.phone],
    );

    const form = useForm<SignupFormValues>({
        mode: "onChange",
        resolver: zodResolver(signupSchema),
        defaultValues,
    });

    useEffect(() => {
        const subscription = form.watch((values) => {
            setState({
                email: values.email ?? "",
                name: values.name ?? "",
                phone: values.phone ?? "",
                password: values.password ?? "",
                passwordConfirm: values.passwordConfirm ?? "",
            });
        });
        return () => subscription.unsubscribe();
    }, [form, setState]);

    const lastResetCount = useRef(resetCount);

    useEffect(() => {
        if (lastResetCount.current !== resetCount) {
            form.reset(defaultValues);
            lastResetCount.current = resetCount;
        }
    }, [defaultValues, form, resetCount]);

    return <FormProvider {...form}>{children}</FormProvider>;
}
