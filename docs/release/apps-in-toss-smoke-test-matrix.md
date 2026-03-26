# Apps in Toss Smoke Test Matrix

Use this matrix before release review and again after any hotfix build.

## Environments

- `Sandbox`: local-like validation inside the Apps in Toss sandbox app.
- `Toss App`: QR / private-app launch in the real Toss container.

## Matrix

| Environment | Flow                      | Steps                                                                                         | Expected Result                                                      | Blocker Criteria                                                                     |
| ----------- | ------------------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Sandbox     | Onboarding                | Open app on a fresh install profile, complete onboarding, relaunch.                           | Onboarding appears once, then stays dismissed on relaunch.           | Blocker if onboarding cannot complete or repeats unexpectedly.                       |
| Sandbox     | Login / member            | Sign in, sign out, sign back in, then open Home and Settings.                                 | Session state persists correctly and account-specific UI renders.    | Blocker if login fails, session resets, or auth state is inconsistent.               |
| Sandbox     | Guest flow                | Launch as guest, search, open a word, and verify saved-word limits or guest restrictions.     | Guest flow works and restricted actions are clearly handled.         | Blocker if guest users can break auth state or hit unhandled errors.                 |
| Sandbox     | Search                    | Search several common and edge-case terms, switch between results, and repeat a prior search. | Results render, loading states resolve, and history updates cleanly. | Blocker if search hangs, crashes, or returns a broken result screen.                 |
| Sandbox     | Favorites                 | Add a word to favorites, remove it, then reopen the app.                                      | Favorite state persists and the UI updates immediately.              | Blocker if favorites do not persist or the list desynchronizes.                      |
| Sandbox     | Audio                     | Play pronunciation audio from a search result and retry after one failed attempt.             | Audio starts, completes, and failure states are handled gracefully.  | Blocker if playback crashes, freezes, or has no user-visible failure state.          |
| Sandbox     | AI degraded / unavailable | Disable proxy or health endpoint, then open AI entry points and study surfaces.               | AI features fail closed with a clear unavailable/degraded message.   | Blocker if the app shows broken AI UI, uncaught errors, or unsafe fallback behavior. |
| Sandbox     | Settings / legal          | Open theme, font, onboarding replay, privacy, and terms screens.                              | Settings navigation works and legal links open valid content.        | Blocker if legal links are broken, placeholder, or non-HTTPS.                        |
| Toss App    | Onboarding                | Launch from QR/private link on a device not used for sandbox verification.                    | Same onboarding behavior as sandbox.                                 | Blocker if Toss container behavior differs from sandbox in a release-critical way.   |
| Toss App    | Login / member            | Verify member auth on the real Toss container, including app relaunch.                        | Auth survives container restart and renders the right account state. | Blocker if account auth fails only in Toss App.                                      |
| Toss App    | Guest flow                | Verify guest entry, search, and exit back to app home.                                        | Guest experience is usable without auth regressions.                 | Blocker if guest entry is blocked or produces a dead end.                            |
| Toss App    | Search / favorites        | Search, favorite a word, and confirm the state survives navigation.                           | Core vocabulary workflow behaves identically to sandbox.             | Blocker if search or favorites fail in the real container.                           |
| Toss App    | Audio / AI                | Play audio and verify AI surfaces against live proxy health.                                  | Audio and AI surfaces degrade predictably and do not crash.          | Blocker if proxy issues take down the screen or bypass fail-closed behavior.         |
| Toss App    | Settings / legal          | Reopen settings, verify legal URLs, and confirm release copy.                                 | Settings and compliance surfaces remain valid in production context. | Blocker if legal URLs, release copy, or settings navigation are wrong.               |

## Severity Guide

- `P0`: Release blocker. User flow is broken, crashes, or violates compliance/security expectations.
- `P1`: Fix before review if it affects the primary flow or makes the review ambiguous.
- `P2`: Track as follow-up if the flow still works and the issue is cosmetic or low-risk.

## Release Gate

- Do not submit for review until every `P0` item is cleared in both environments.
- Keep one verified `.ait` build tied to the smoke test notes and the branch name.
