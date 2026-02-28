# Vocationary

> v1.0.0

## 주요 기능 (Korean)

- **로그인 진입 UX**: 앱 첫 진입 시 로그인 화면이 기본으로 표시돼요.
- **게스트 체험 모드**: 로그인 없이 단어를 검색할 수 있고, 단어장 저장은 최대 10개로 제한돼요.
- **사전 검색 (영영)**: 현재는 `en-en` 모드만 제공하며, 영한(`en-ko`) 모드는 개발 중이라 UI에서 숨겨져 있어요.
- **단어장 관리**: 사용자별로 단어를 저장하거나 삭제하면 로컬 SQLite DB에 동기화되어 세션이 바뀌어도 목록이 유지돼요.
- **홈 요약 대시보드**: 현재 사용자(게스트/회원), 사용 중인 사전 모드, 단어장 개수, 최근 검색어를 한눈에 보여줘요.
- **탭 내비게이션**: 홈, 단어장, 검색, 설정 네 개의 탭으로 주요 기능을 빠르게 이동할 수 있어요.
- **설정 화면**: 테마/폰트, 온보딩 재보기, 법적 문서, 백업/복원 옵션을 제공해요.
- **로컬 인증**: 이메일/비밀번호 로그인, 회원가입, 비밀번호 재설정을 로컬 데이터베이스 기반으로 처리해요.

## Key Features (English)

- **Login-First Entry UX**: The first app entry opens the login screen by default.
- **Guest Preview Mode**: Users can search without authentication, with a word list cap of 10 words.
- **Dictionary Search (EN-EN)**: Only `en-en` is currently exposed; `en-ko` is hidden while still under development.
- **Word List Management**: Save or remove words per user; everything is persisted locally with SQLite so the word list survives app restarts.
- **Home Summary Dashboard**: Highlights current profile state (guest/member), active dictionary mode, saved word count, and recent query.
- **Tabbed Navigation**: Home, Word List, Search, and Settings tabs keep every major workflow just one tap away.
- **Settings Screen**: Includes theme/font controls, onboarding replay, legal docs, and encrypted backup/restore.

## Versioning

- `expo.version` and `ios.buildNumber` move together (e.g., `1.0.1` for the next release).
- `android.versionCode` starts at `1` and must be incremented for every Play Store upload.
- Update all three fields before cutting a new store build.

## Database Schema Migrations

- Native SQLite schema is versioned via `PRAGMA user_version`.
- Forward-only migrations are defined in `src/services/database/migrations/steps/` and executed sequentially at app startup.
- Migration runner applies each step inside `BEGIN IMMEDIATE`/`COMMIT`; failures trigger `ROLLBACK` and raise a controlled error.
- Regression tests for old-schema upgrade and rollback safety live in `src/services/database/migrations/__tests__/migration.test.ts`.

## Environment & Security

- Use `.env` (local only) and never commit real API keys. Configure Expo public vars for client proxy routing:
    - `EXPO_PUBLIC_OPENAI_PROXY_URL`
    - `EXPO_PUBLIC_OPENAI_PROXY_KEY`
    - `EXPO_PUBLIC_AI_HEALTH_URL` (optional; defaults to `<EXPO_PUBLIC_OPENAI_PROXY_URL>/health`)
- Set server vars separately:
    - `AI_PROXY_KEY` (server-side request auth)
    - `OPENAI_API_KEY` (server-side OpenAI access)
- Feature flags (client):
    - `EXPO_PUBLIC_FEATURE_GUEST_ACCOUNT_CTA`: enable guest account conversion card in Settings
    - `EXPO_PUBLIC_FEATURE_BACKUP_RESTORE`: enable backup/restore section in Settings
        - If env vars are missing, `app.config.ts` applies profile defaults:
            - `development`: guest account CTA `true`, backup/restore `false`
            - `production`: guest account CTA `false`, backup/restore `false`
        - `EAS_BUILD_PROFILE` (or `APP_ENV`) decides the active profile.

## Compliance & Security

- Privacy/Terms links live in `app.json` (Expo `extra`) and are validated in `src/config/legal.ts`.
  Invalid or non-HTTPS URLs will fallback to the in-app legal documents. Ensure hosted URLs are set before release.
- Automatic login credentials are stored with SecureStore/Keychain on device; logout clears the secure entry.
- AI-powered examples/TTS require a backend proxy (`EXPO_PUBLIC_OPENAI_PROXY_URL` + `EXPO_PUBLIC_OPENAI_PROXY_KEY`). Without them, the UI keeps the feature disabled and surfaces an in-app notice.
- 인증(로그인/회원가입/비밀번호 재설정)과 단어장/검색 기록/설정은 로컬 SQLite에 유지됩니다.
- Quick start: `cp .env.example .env` 후 값 채우기
