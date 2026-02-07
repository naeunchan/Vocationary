import { z } from "zod";

export const emailSchema = z.object({
    email: z.string().trim().email("올바른 이메일 주소를 입력해주세요."),
});

export const nameSchema = z.object({
    name: z.string().trim().min(2, "이름은 2자 이상이어야 해요.").max(30, "이름은 30자 이하로 입력해주세요."),
});

export const phoneSchema = z.object({
    phone: z.string().regex(/^010\d{8}$/, "휴대폰 번호를 다시 확인해주세요."),
});

export const passwordSchema = z
    .string()
    .min(8, "8~20자로 입력해주세요.")
    .max(20, "8~20자로 입력해주세요.")
    .refine((value) => !/\s/.test(value), "공백은 사용할 수 없어요.")
    .refine((value) => /[A-Za-z]/.test(value), "영문이 포함되어야 해요.")
    .refine((value) => /\d/.test(value), "숫자가 포함되어야 해요.")
    .refine((value) => /[^A-Za-z0-9]/.test(value), "특수문자가 포함되어야 해요.");

export const passwordStepSchema = z
    .object({
        password: passwordSchema,
        passwordConfirm: z.string(),
    })
    .refine((data) => data.password === data.passwordConfirm, {
        path: ["passwordConfirm"],
        message: "비밀번호가 일치하지 않아요.",
    });

export const signupSchema = z
    .object({
        email: emailSchema.shape.email,
        name: nameSchema.shape.name,
        phone: phoneSchema.shape.phone,
        password: passwordSchema,
        passwordConfirm: z.string(),
    })
    .refine((data) => data.password === data.passwordConfirm, {
        path: ["passwordConfirm"],
        message: "비밀번호가 일치하지 않아요.",
    });

export type SignupFormValues = z.infer<typeof signupSchema>;

export const signupDefaultValues: SignupFormValues = {
    email: "",
    name: "",
    phone: "",
    password: "",
    passwordConfirm: "",
};

export type PasswordRuleState = {
    length: boolean;
    letter: boolean;
    number: boolean;
    special: boolean;
    match: boolean;
};

export function getPasswordRuleState(password: string, confirm: string): PasswordRuleState {
    return {
        length: password.length >= 8 && password.length <= 20,
        letter: /[A-Za-z]/.test(password),
        number: /\d/.test(password),
        special: /[^A-Za-z0-9]/.test(password),
        match: confirm.length > 0 && password === confirm,
    };
}
