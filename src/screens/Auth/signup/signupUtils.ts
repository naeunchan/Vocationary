export function normalizeEmail(value: string) {
    return value.trim().toLowerCase();
}

export function normalizeName(value: string) {
    return value.trim();
}

export function normalizePhoneInput(value: string) {
    return value.replace(/\D/g, "").slice(0, 11);
}

export function formatPhoneNumber(value: string) {
    const digits = normalizePhoneInput(value);
    if (digits.length <= 3) {
        return digits;
    }
    if (digits.length <= 7) {
        return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    }
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}
