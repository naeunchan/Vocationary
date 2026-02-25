# Privacy Policy (Vocationary)

_Last updated: 2026-02-21_

Vocationary uses Firebase Authentication for account sign-in and keeps learning data on your device. We do not sell personal data.

## Data We Process

- Account data: email address, authentication provider ID, Firebase UID
- App data: favorites, search history, settings (stored locally on device)
- Diagnostics: optional crash/error data via Sentry (if configured)

## How We Use Data

- Authenticate users (email/password)
- Send password-reset emails through Firebase Auth
- Persist and show your local learning history
- Improve reliability through error monitoring (optional)

## Storage & Security

- Authentication state is managed by Firebase Auth persistence on device
- App content data is stored in local SQLite on device
- Exported backup files are user-managed; we do not collect them

## Third-Party Services

- Firebase Authentication (Google LLC)
- Optional Sentry crash monitoring

## Your Choices

- You can delete your account and local data in Settings
- You can uninstall the app to remove local data
- You can disable crash reporting by not configuring Sentry DSN

## Contact

- Email: support@vocationary.app

If you host this file elsewhere, update `PRIVACY_POLICY_URL` in `src/config/legal.ts` before release.
