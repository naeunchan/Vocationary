type Locale = "ko" | "en";

const translations: Record<Locale, Record<string, string>> = {
    ko: {
        "auth.login.title": "다시 만나서 반가워요!",
        "auth.signup.title": "처음 오셨군요!",
        "auth.login.subtitle": "로그인에 문제가 있으면 아래의 계정 복구 안내를 확인하세요.",
        "auth.signup.subtitle": "게스트로 시작한 뒤 설정에서 계정 정보를 관리할 수 있어요.",
        "auth.login.primary": "이메일로 로그인",
        "auth.signup.primary": "회원가입",
        "auth.toggle.toSignup": "아직 계정이 없으신가요?",
        "auth.toggle.toLogin": "이미 계정이 있으신가요?",
        "auth.toggle.signupAction": "회원가입",
        "auth.toggle.loginAction": "로그인",
        "auth.forgotPassword": "비밀번호를 잊으셨나요?",
        "onboarding.slide.search.title": "검색하고 저장하세요",
        "onboarding.slide.search.description": "사전에서 단어를 찾고 바로 단어장에 저장할 수 있어요.",
        "onboarding.slide.examples.title": "예문과 번역 제공",
        "onboarding.slide.examples.description": "AI가 생성하는 예문과 번역으로 의미를 쉽게 익혀요.",
        "onboarding.slide.favorites.title": "단어장으로 복습",
        "onboarding.slide.favorites.description": "단어를 상태별로 분류해서 체계적으로 복습해보세요.",
        "onboarding.button.next": "다음",
        "onboarding.button.start": "시작하기",
        "settings.section.general": "일반",
        "settings.section.display": "디스플레이",
        "settings.section.backup": "백업 및 복원",
        "settings.section.account": "계정",
        "settings.link.tutorial": "튜토리얼 다시 보기",
        "settings.link.contact": "1:1 문의 보내기",
        "settings.link.privacy": "개인정보 처리방침",
        "settings.link.terms": "서비스 이용약관",
        "settings.link.legal": "법적 고지 및 정보",
        "settings.link.recovery": "계정 복구 안내",
        "settings.link.biometric": "생체인증 자동 로그인",
        "settings.link.aiStatus": "AI 발음/예문 상태",
        "settings.link.appVersion": "앱 버전",
        "settings.link.signUp": "회원가입 후 계속하기",
        "settings.link.login": "기존 계정으로 로그인",
        "settings.link.theme": "화면 모드",
        "settings.link.font": "글자 크기",
        "settings.link.backupExport": "데이터 백업 내보내기",
        "settings.link.backupImport": "백업에서 복원하기",
        "settings.label.recoveryUnavailable": "비밀번호 복구 불가",
        "settings.label.biometricOn": "켜짐",
        "settings.label.biometricOff": "꺼짐",
        "settings.label.comingSoon": "준비 중",
        "settings.label.aiHealthy": "활성",
        "settings.label.aiDegraded": "제한적 (백엔드 확인 필요)",
        "settings.label.aiUnavailable": "비활성 (백엔드 필요)",
        "search.aiNotice.title": "AI 발음/예문 준비 중",
        "search.aiNotice.body":
            "백엔드 프록시가 설정되면 발음 재생과 AI 예문이 자동으로 활성화돼요. 현재는 사전 검색만 이용할 수 있어요.",
    },
    en: {
        "auth.login.title": "Welcome back!",
        "auth.signup.title": "Nice to meet you!",
        "auth.login.subtitle": "If you have trouble signing in, check the account recovery guidance below.",
        "auth.signup.subtitle": "Start as a guest and manage account details in Settings.",
        "auth.login.primary": "Log in with email",
        "auth.signup.primary": "Sign up",
        "auth.toggle.toSignup": "Don’t have an account yet?",
        "auth.toggle.toLogin": "Already have an account?",
        "auth.toggle.signupAction": "Sign up",
        "auth.toggle.loginAction": "Log in",
        "auth.forgotPassword": "Forgot your password?",
        "onboarding.slide.search.title": "Search & Save",
        "onboarding.slide.search.description": "Find words in the dictionary and save them instantly.",
        "onboarding.slide.examples.title": "Examples & Translations",
        "onboarding.slide.examples.description": "AI-generated examples and translations make meanings stick.",
        "onboarding.slide.favorites.title": "Review Word List",
        "onboarding.slide.favorites.description": "Organize words by status and review with confidence.",
        "onboarding.button.next": "Next",
        "onboarding.button.start": "Get started",
        "settings.section.general": "General",
        "settings.section.display": "Display",
        "settings.section.backup": "Backup & Restore",
        "settings.section.account": "Account",
        "settings.link.tutorial": "View tutorial",
        "settings.link.contact": "Contact support",
        "settings.link.privacy": "Privacy Policy",
        "settings.link.terms": "Terms of Service",
        "settings.link.legal": "Legal notice",
        "settings.link.recovery": "Recovery policy",
        "settings.link.biometric": "Biometric auto-login",
        "settings.link.aiStatus": "AI pronunciation/examples status",
        "settings.link.appVersion": "App version",
        "settings.link.signUp": "Continue with sign up",
        "settings.link.login": "Log in with existing account",
        "settings.link.theme": "Theme",
        "settings.link.font": "Font size",
        "settings.link.backupExport": "Export backup",
        "settings.link.backupImport": "Import backup",
        "settings.label.recoveryUnavailable": "No password recovery",
        "settings.label.biometricOn": "On",
        "settings.label.biometricOff": "Off",
        "settings.label.comingSoon": "Coming soon",
        "settings.label.aiHealthy": "Active",
        "settings.label.aiDegraded": "Degraded (check backend)",
        "settings.label.aiUnavailable": "Disabled (needs backend)",
        "search.aiNotice.title": "AI pronunciation/examples pending",
        "search.aiNotice.body":
            "Once the backend proxy is configured, pronunciation and AI examples will activate. For now, dictionary search works without them.",
    },
};

function resolveDefaultLocale(): Locale {
    try {
        const locale = Intl.DateTimeFormat().resolvedOptions().locale;
        if (locale?.toLowerCase().startsWith("ko")) {
            return "ko";
        }
    } catch {
        // Ignore resolution errors and fallback to Korean.
    }
    return "ko";
}

const activeLocale: Locale = resolveDefaultLocale();

export function t(key: string): string {
    const localePack = translations[activeLocale];
    if (localePack?.[key]) {
        return localePack[key];
    }
    const fallback = translations.en[key];
    return fallback ?? key;
}
