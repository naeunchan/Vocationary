export function getEmailValidationError(email: string): string | null {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
        return "이메일 주소를 입력해주세요.";
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail.toLowerCase())) {
        return "유효한 이메일 주소를 입력해주세요.";
    }
    return null;
}

export function getNameValidationError(name: string): string | null {
    const trimmedName = name.trim();
    if (!trimmedName) {
        return "이름을 입력해주세요.";
    }
    if (trimmedName.length < 2) {
        return "이름은 2자 이상 입력해주세요.";
    }
    return null;
}

export function normalizePhoneNumber(phoneNumber: string): string {
    return phoneNumber.trim().replace(/[\s-]/g, "");
}

export function getPhoneNumberValidationError(phoneNumber: string): string | null {
    const trimmedPhone = phoneNumber.trim();
    if (!trimmedPhone) {
        return "휴대폰 번호를 입력해주세요.";
    }
    const normalized = normalizePhoneNumber(trimmedPhone);
    const numeric = normalized.startsWith("+") ? normalized.slice(1) : normalized;
    if (!/^\d+$/.test(numeric)) {
        return "휴대폰 번호 형식을 확인해주세요.";
    }
    if (numeric.length < 9 || numeric.length > 15) {
        return "휴대폰 번호 형식을 확인해주세요.";
    }
    return null;
}

export function getGooglePasswordValidationError(password: string): string | null {
    if (!password) {
        return "비밀번호를 입력해주세요.";
    }
    if (password.length < 8) {
        return "비밀번호는 8자 이상이어야 해요.";
    }
    if (/\s/.test(password)) {
        return "비밀번호에는 공백을 사용할 수 없어요.";
    }
    const hasLetter = /[A-Za-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    if (!hasLetter || !hasNumber) {
        return "비밀번호에는 영문과 숫자를 모두 포함해야 해요.";
    }
    return null;
}
