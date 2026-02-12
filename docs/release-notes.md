# Release Readiness Checklist (Phase 1–3)

- Update `app.json` versions (`expo.version`, `ios.buildNumber`, `android.versionCode`) before cutting builds.
- Set your hosted Privacy/Terms URLs via `app.json -> extra.privacyPolicyUrl` / `extra.termsOfServiceUrl`; if empty, the app falls back to the in-app legal modal. Verify they open from Settings.
- Configure `OPENAI_PROXY_URL` for AI examples/TTS; if absent, keep store copy/screenshots AI-free.
- Ensure SecureStore credentials are cleared on logout; smoke-test login → logout → login flows.
- Run `npm test` and a release build (`eas build --profile production` or `expo export --platform android,ios`) before submission.
- For pull requests, ensure CI `android-smoke` passes (`:app:assembleDebug`). On failures, inspect the `android-smoke-diagnostics-*` artifact logs/reports.
- Copy `.env.example` to `.env` (or configure in CI) with Sentry/Dictionary/AI proxy values and any server settings used for release builds.
