# Vocationary

> v1.0.0

## 주요 기능 (Korean)

- **게스트 중심 진입 UX**: 현재 기본 설정(운영 프로필)에서는 게스트 모드로 바로 시작하며, 로그인/회원가입 UI는 feature flag로 제어돼요.
- **게스트 체험 모드**: 로그인 없이 단어를 검색할 수 있고, 즐겨찾기 저장은 최대 10개로 제한돼요.
- **사전 검색 (영영/영한)**: `en-en`, `en-ko` 모드를 지원하며, AI 프록시 상태에 따라 번역/예문 품질이 달라질 수 있어요.
- **즐겨찾기 관리**: 사용자별로 단어를 저장하거나 삭제하면 로컬 SQLite DB에 동기화되어 세션이 바뀌어도 목록이 유지돼요.
- **홈 요약 대시보드**: 현재 사용자(게스트/회원), 사용 중인 사전 모드, 즐겨찾기 개수, 최근 검색어를 한눈에 보여줘요.
- **탭 내비게이션**: 홈, 즐겨찾기, 검색, 설정 네 개의 탭으로 주요 기능을 빠르게 이동할 수 있어요.
- **설정 화면**: 테마/폰트, 온보딩 재보기, 법적 문서, 백업/복원, 생체인증 옵션을 제공해요.

## Key Features (English)

- **Guest-First Entry UX**: With current production defaults, the app starts in guest-focused mode; sign-in/sign-up UI is controlled by feature flags.
- **Guest Preview Mode**: Users can search without authentication, with a favorites cap of 10 words.
- **Dictionary Search (EN-EN / EN-KO)**: Both modes exist; translation/example quality depends on AI proxy availability.
- **Favorites Management**: Save or remove words per user; everything is persisted locally with SQLite so favorites survive app restarts.
- **Home Summary Dashboard**: Highlights current profile state (guest/member), active dictionary mode, saved word count, and recent query.
- **Tabbed Navigation**: Home, Favorites, Search, and Settings tabs keep every major workflow just one tap away.
- **Settings Screen**: Includes theme/font controls, onboarding replay, legal docs, encrypted backup/restore, and biometric preference.

## Versioning

- `expo.version` and `ios.buildNumber` move together (e.g., `1.0.1` for the next release).
- `android.versionCode` starts at `1` and must be incremented for every Play Store upload.
- Update all three fields before cutting a new store build.

## Environment & Security

- Use `.env.example` as a template; never commit real API keys. Set `AI_PROXY_KEY` on the server and pass `EXPO_PUBLIC_OPENAI_PROXY_KEY` to the app so AI routes require authentication.
- Feature flags (client):
    - `EXPO_PUBLIC_FEATURE_AUTH_UI`: enable login/signup mode UI
    - `EXPO_PUBLIC_FEATURE_GUEST_ACCOUNT_CTA`: enable guest account conversion card in Settings
    - If env vars are missing, `app.config.ts` applies profile defaults:
        - `development`: both `true`
        - `production`: both `false`
    - `EAS_BUILD_PROFILE` (or `APP_ENV`) decides the active profile.

## Compliance & Security

- Privacy/Terms links live in `app.json` (Expo `extra`) and are validated in `src/config/legal.ts`.
  Invalid or non-HTTPS URLs will fallback to the in-app legal documents. Ensure hosted URLs are set before release.
- Automatic login credentials are stored with SecureStore/Keychain on device; logout clears the secure entry.
- Optional biometric-gated auto-login is available via device capabilities (toggle in Settings).
- AI-powered examples/TTS require a backend proxy (`OPENAI_PROXY_URL`). Without it, the UI keeps the feature disabled and surfaces an in-app notice.
- No password recovery is provided; passwords are device-local. Set clear store copy or add a reset flow before launch.
