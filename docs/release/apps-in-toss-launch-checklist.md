# Apps in Toss Launch Checklist

## 1. Release Candidate Freeze

- Confirm the release branch and build from a dedicated branch, not `main`.
- Update `app.json` `expo.version` and `extra.versionLabel` for the release candidate.
- Confirm `AIT_APP_NAME`, `AIT_DISPLAY_NAME`, `AIT_APP_ICON_URL`, and `AIT_PRIMARY_COLOR` before running `npm run build`.
- Decide the first-release feature scope explicitly. Production defaults in `app.config.ts` and `granite.config.ts` are conservative.
- If the release includes member login, set `EXPO_PUBLIC_FEATURE_ACCOUNT_AUTH=true` explicitly.

## 2. Environment Freeze

- Copy `.env.example` to `.env` and replace placeholder values.
- Verify the legal URLs resolve over HTTPS. If they are invalid, the app falls back to in-app legal documents.
- Verify `EXPO_PUBLIC_OPENAI_PROXY_URL`, `EXPO_PUBLIC_OPENAI_PROXY_KEY`, and `EXPO_PUBLIC_AI_HEALTH_URL` against the real proxy.
- Verify `AI_PROXY_KEY` and `OPENAI_API_KEY` are configured only on the backend.

## 3. Backend And CORS Readiness

- Set `AIT_APP_NAME` on the proxy server so the Apps in Toss live and QR test origins are allowed automatically.
- If additional browser origins are needed, append them via `CORS_ORIGINS`.
- Confirm the proxy responds on `/health`, `/dictionary/examples`, and `/dictionary/tts`.
- Smoke-test the proxy with the same env values the release build will use.

## 4. Local Validation

- Run `npm run lint -- --max-warnings=0`.
- Run `npm test -- --watch=false`.
- Run `npm run build`.
- Confirm the generated `.ait` file size stays under the Apps in Toss limit.

## 5. Toss App Testing

- Upload the `.ait` build and complete at least one Toss app test before requesting review.
- Test both sandbox and Toss app QR/private launch flows.
- Verify onboarding, login/session restore, search, favorites, audio playback, settings, and legal links.
- Verify AI features degrade safely when the proxy or health endpoint is unavailable.

## 6. Review Submission

- Prepare the store description, representative screenshots, and any reviewer notes.
- Submit only one version at a time. Apps in Toss review allows only one version in review concurrently.
- Keep a short fix window available after submission in case review feedback requires a quick rebuild.

## 7. Release Day

- Release during a low-risk window.
- Monitor proxy health, API failures, audio generation errors, and auth/session regressions for the first 24 to 48 hours.
- Keep the previous approved version available for rollback.

## Commands

```bash
cp .env.example .env
npm run lint -- --max-warnings=0
npm test -- --watch=false
npm run build
```
