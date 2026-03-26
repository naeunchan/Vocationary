# Vocachip

> v1.0.0

## Coding Agents

- Primary project guidance for coding agents lives in `AGENTS.md`.
- In Codex, use `/architecture <task>` or `$architecture` for senior-level architecture reviews, tradeoff analysis, and migration planning.
- In Codex, use `/develop <task>` or `$develop` for implementation work.
- In Codex, use `/design <task>` or `$design` for UI design, UX flow, usability, and interaction work.
- In Codex, use `/pm <task>` or `$pm` for planning and scope breakdown work.

## 주요 기능 (Korean)

- **로그인 진입 UX**: 앱 첫 진입 시 로그인 화면이 기본으로 표시돼요.
- **게스트 체험 모드**: 로그인 없이 단어를 검색할 수 있고, 단어장 저장은 최대 10개로 제한돼요.
- **사전 검색 (영영)**: 현재는 `en-en` 모드만 제공하며, 영한(`en-ko`) 모드는 개발 중이라 UI에서 숨겨져 있어요.
- **단어장 관리**: 사용자별로 단어를 저장하거나 삭제하면 앱 내부 상태에 반영되어 화면에 즉시 표시돼요.
- **홈 요약 대시보드**: 현재 사용자(게스트/회원), 사용 중인 사전 모드, 단어장 개수, 최근 검색어를 한눈에 보여줘요.
- **탭 내비게이션**: 홈, 단어장, 검색, 설정 네 개의 탭으로 주요 기능을 빠르게 이동할 수 있어요.
- **설정 화면**: 테마/폰트, 온보딩 재보기, 법적 문서, 백업/복원 옵션을 제공해요.
- **로컬 인증**: 이메일/비밀번호 로그인, 회원가입, 비밀번호 재설정을 로컬 데이터베이스 기반으로 처리해요.

## Key Features (English)

- **Login-First Entry UX**: The first app entry opens the login screen by default.
- **Guest Preview Mode**: Users can search without authentication, with a word list cap of 10 words.
- **Dictionary Search (EN-EN)**: Only `en-en` is currently exposed; `en-ko` is hidden while still under development.
- **Word List Management**: Save or remove words per user; updates are reflected immediately in app state.
- **Home Summary Dashboard**: Highlights current profile state (guest/member), active dictionary mode, saved word count, and recent query.
- **Tabbed Navigation**: Home, Word List, Search, and Settings tabs keep every major workflow just one tap away.
- **Settings Screen**: Includes theme/font controls, onboarding replay, legal docs, and encrypted backup/restore.

## Versioning

- `expo.version` is the release version and should be incremented for each production release.
- `eas.json` sets `APP_ENV=production` for the `production` build profile so `app.config.ts` resolves production defaults during store builds.

## Apps in Toss Release

- The detailed release checklist lives in `docs/release/apps-in-toss-launch-checklist.md`.
- `npm run build` creates the Apps in Toss bundle as a `.ait` artifact.
- Set `AIT_APP_NAME`, `AIT_DISPLAY_NAME`, `AIT_APP_ICON_URL`, and `AIT_PRIMARY_COLOR` before cutting a release build.
- Production defaults are conservative. If the release should include member login, set `EXPO_PUBLIC_FEATURE_ACCOUNT_AUTH=true` explicitly.
- When `AIT_APP_NAME` is set on the proxy server, `server/index.js` automatically allows these Toss browser origins:
    - `https://<AIT_APP_NAME>.apps.tossmini.com`
    - `https://<AIT_APP_NAME>.private-apps.tossmini.com`

## Android Release Builds

- The first Android `production` EAS build needs a signing keystore configured before any `--non-interactive` build can pass.
- Bootstrap it once with `npx eas-cli@latest credentials:configure-build -p android -e production` or by running a single interactive `eas build -p android --profile production`.
- After the keystore is stored on Expo servers, CI/non-interactive production builds can reuse the remote Android credentials.

## iOS Release Builds

- `app.json` sets `ios.infoPlist.ITSAppUsesNonExemptEncryption=false` so App Store Connect receives an explicit export-compliance answer for the current app binary.
- The first iOS `production` EAS build still needs signing credentials configured and validated interactively.
- Bootstrap it once with `npx eas-cli@latest credentials:configure-build -p ios -e production` or by running a single interactive `eas build -p ios --profile production`.
- After the certificate/provisioning profile is stored on Expo servers, CI/non-interactive production builds can reuse the remote iOS credentials.

## Environment & Security

- Use `.env` (local only) and never commit real API keys. Configure Expo public vars for client proxy routing:
    - `EXPO_PUBLIC_OPENAI_PROXY_URL`
    - `EXPO_PUBLIC_OPENAI_PROXY_KEY`
    - `EXPO_PUBLIC_AI_HEALTH_URL` (optional; defaults to `<EXPO_PUBLIC_OPENAI_PROXY_URL>/health`)
    - `EXPO_PUBLIC_FEATURE_ACCOUNT_AUTH`
- Set server vars separately:
    - `AI_PROXY_KEY` (server-side request auth)
    - `OPENAI_API_KEY` (server-side OpenAI access)
- Feature flags (client):
    - `EXPO_PUBLIC_FEATURE_GUEST_ACCOUNT_CTA`: enable guest account conversion card in Settings
    - `EXPO_PUBLIC_FEATURE_BACKUP_RESTORE`: enable backup/restore section in Settings
        - If env vars are missing, `app.config.ts` applies profile defaults:
            - `development`: guest account CTA `true`, backup/restore `false`
            - `production`: guest account CTA `false`, backup/restore `false`
        - `APP_ENV` decides the active profile.
- `.env.example` includes the current Apps in Toss, client runtime, and server release placeholders.

## Compliance & Security

- Privacy/Terms links live in `app.json` (Expo `extra`) and are validated in `src/config/legal.ts`.
  Invalid or non-HTTPS URLs will fallback to the in-app legal documents. Ensure hosted URLs are set before release.
- Automatic login credentials are stored in app-managed storage and removed on logout.
- AI-powered examples/TTS require a backend proxy (`EXPO_PUBLIC_OPENAI_PROXY_URL` + `EXPO_PUBLIC_OPENAI_PROXY_KEY`). Without them, the UI keeps the feature disabled and surfaces an in-app notice.
- 인증, 세션, 단어장, 검색 기록은 현재 `src/services/database/index.ts`를 통해 관리되며, 원격 백엔드를 기본 전제로 두지 않습니다.
- Quick start: `cp .env.example .env` 후 값 채우기
