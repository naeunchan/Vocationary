# Release Readiness Checklist

- Follow `docs/release/apps-in-toss-launch-checklist.md` for the full Apps in Toss release sequence.
- Update `app.json` `expo.version` and `extra.versionLabel` before cutting builds.
- Copy `.env.example` to `.env` and replace every placeholder value used by the release candidate.
- Set hosted Privacy/Terms URLs and verify they open correctly from Settings.
- If the release includes member login, set `EXPO_PUBLIC_FEATURE_ACCOUNT_AUTH=true` explicitly.
- Run `npm run lint -- --max-warnings=0`, `npm test -- --watch=false`, and `npm run build` before submission.
