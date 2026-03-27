# Apps in Toss Release Runbook

## Goal

Ship Vocachip to Apps in Toss with a release candidate that is predictable to build, easy to review, and safe to roll back.

The release must cover:

- a generated `.ait` artifact from `npm run build`
- explicit Apps in Toss identity values via `AIT_*`
- a clear feature stance for member auth via `EXPO_PUBLIC_FEATURE_ACCOUNT_AUTH`
- working AI proxy and health configuration when AI is enabled
- manual validation of the critical app flows before review submission

## Release Inputs

Prepare these inputs before you touch the release build:

- `app.json` version and `extra.versionLabel`
- `AIT_APP_NAME`
- `AIT_DISPLAY_NAME`
- `AIT_APP_ICON_URL`
- `AIT_PRIMARY_COLOR`
- hosted Privacy and Terms URLs
- `EXPO_PUBLIC_FEATURE_ACCOUNT_AUTH`
- `EXPO_PUBLIC_OPENAI_PROXY_URL`
- `EXPO_PUBLIC_OPENAI_PROXY_KEY`
- `EXPO_PUBLIC_AI_HEALTH_URL`
- backend `AI_PROXY_KEY`
- backend `OPENAI_API_KEY`
- `CORS_ORIGINS` if the proxy needs extra browser origins beyond the Toss app domains

Treat these values as release-candidate inputs, not placeholders. If any of them are still uncertain, stop before the build.

## Preflight Checks

Run the checks below in order.

1. Confirm the release branch is not `main`.
2. Confirm the release candidate uses the intended production profile.
3. Confirm `AIT_APP_NAME`, `AIT_DISPLAY_NAME`, and `AIT_APP_ICON_URL` are real values for the published app.
4. Confirm `EXPO_PUBLIC_FEATURE_ACCOUNT_AUTH` matches the release decision.
    - If login is part of the release, set it explicitly.
    - If login is not part of the release, keep it off and do not rely on profile defaults.
5. Confirm legal URLs resolve over HTTPS and are not placeholders.
6. Confirm AI proxy configuration is complete when AI features are enabled.
    - `EXPO_PUBLIC_OPENAI_PROXY_URL` must point to the real proxy.
    - `EXPO_PUBLIC_OPENAI_PROXY_KEY` must match the client-facing proxy key.
    - `EXPO_PUBLIC_AI_HEALTH_URL` must return the proxy health payload expected by the app.
7. Confirm the proxy server allows the Toss launch domains.
    - `https://<AIT_APP_NAME>.apps.tossmini.com`
    - `https://<AIT_APP_NAME>.private-apps.tossmini.com`
8. Confirm the repo is clean enough for a release build and the new `.ait` is the only expected artifact.

## Release Day Sequence

Follow this order when preparing the submission build:

1. Freeze the release inputs.
2. Update the release branch with the final `app.json` version and any release-only env values.
3. Run the release checks locally.
4. Generate the release artifact with `npm run build`.
5. Verify the generated `.ait` exists and matches the expected release candidate.
6. Upload the `.ait` to Apps in Toss.
7. Complete at least one Toss app test before asking for review.
8. Submit the version for review only after manual testing is complete.
9. Keep the branch and env snapshot available until review is accepted.

## Manual Tests

These are the minimum flows that must pass before review submission.

- onboarding entry and first-run presentation
- member login flow when `EXPO_PUBLIC_FEATURE_ACCOUNT_AUTH=true`
- guest flow when account auth is disabled
- search and search history
- favorites add and remove
- audio playback and pronunciation request path
- AI example generation and AI study surfaces when enabled
- AI degraded and unavailable behavior when the proxy or health endpoint is down
- settings screen
- legal links and fallback legal modal behavior
- logout and session restore behavior

Treat any failure in auth, search, favorites, backup, or AI gating as a release blocker until it is understood.

## Rollback Triggers

Do not wait for broad user reports if any of these occur:

- the `.ait` build fails
- the app cannot launch in sandbox or Toss app QR/private mode
- login breaks after `EXPO_PUBLIC_FEATURE_ACCOUNT_AUTH` is enabled
- the proxy returns 401, 403, 503, or repeated 500s for core AI routes
- `AI_HEALTH_URL` reports unhealthy or the app degrades unexpectedly
- legal links fail or open placeholder content
- audio playback fails consistently in release candidate testing
- the release candidate exceeds the Apps in Toss artifact limit or cannot be uploaded

Rollback means reverting to the last approved release candidate or disabling the risky feature flag before another submission.

## Post-Release Monitoring

Monitor the first 24 to 48 hours after release for:

- AI proxy health
- `npm run ai:metrics:check`
- `/dictionary/examples`
- `/dictionary/tts`
- login and session regressions
- search and favorites regressions
- audio playback failures
- legal URL failures
- crash reports and runtime errors

If AI features are enabled, watch both the proxy logs and the client health state. If `EXPO_PUBLIC_FEATURE_ACCOUNT_AUTH` is enabled, watch for session churn and logout/login loops.

## Likely Commands

```bash
cp .env.example .env
npm run lint -- --max-warnings=0
npm test -- --watch=false
npm run ai:metrics:check
npm run build
```

## Acceptance Criteria

- `.ait` is generated successfully from the release branch.
- `AIT_*` values are set to real release values.
- `EXPO_PUBLIC_FEATURE_ACCOUNT_AUTH` matches the release decision.
- AI proxy and health settings are valid when AI is included.
- Manual tests pass for onboarding, auth, search, favorites, audio, settings, and legal flows.
- The Apps in Toss review submission is based on a known-good build, not a partially configured candidate.
