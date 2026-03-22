# AGENTS.md

## Purpose

- This repository is `Vocachip`, an Expo-based React Native vocabulary app.
- Use this file as the project-specific operating guide for Codex.
- Prefer the current source code over README assumptions when they disagree.

## Supported Coding Agents

- `AGENTS.md` is the primary instruction file for Codex in this repository.
- `.github/copilot-instructions.md` mirrors the same project guidance for GitHub Copilot coding agents.
- Custom agent profiles live in `.github/agents/`.
- `architecture.agent.md` handles system design, architecture review, boundary definition, and migration planning.
- `develop.agent.md` handles implementation, bug fixing, refactors, and focused validation work.
- `design.agent.md` handles UI and UX design work within the existing app patterns.
- `project-manager.agent.md` handles planning, sequencing, rollout scope, and risk management.
- `qa.agent.md` handles regression safety, targeted test planning, shared-flow validation, and release-risk review.
- Codex app skills live in `.agents/skills/`.
- In Codex, use `/develop` or `$develop` for implementation work, `/design` or `$design` for UI design, UX flow, usability, and interaction work, `/pm` or `$pm` for planning work, and `/architecture` or `$architecture` for architecture analysis.
- Keep both files aligned when architecture, workflow, or testing expectations change.

## Stack

- Expo SDK 54
- React Native 0.81
- React 19
- TypeScript with `strict: true`
- Jest + `@testing-library/react-native`
- ESLint flat config + Prettier
- `npm` is the package manager. `package-lock.json` is authoritative.

## Core Commands

- Install: `npm ci`
- Start Expo: `npm start`
- Start web: `npm run web`
- Start local AI proxy: `npm run proxy`
- Lint: `npm run lint -- --max-warnings=0`
- Auto-fix lint: `npm run lint:fix`
- Test: `npm test -- --watch=false`
- Single test file: `npm test -- --watch=false <path>`
- CI web export: `npm run ci:build`

## Default Agent Workflow

- Read the relevant feature folder, nearby tests, and the source-of-truth boundary files before editing.
- Prefer small, local changes over broad rewrites.
- Preserve public function signatures unless the task explicitly requires a breaking change.
- If the user asks for a PR, or the task is clearly intended to end in a PR, create or switch to a dedicated branch before making new edits.
- Use the `codex/<short-task-name>` branch pattern by default unless the user specifies a different name.
- Do not do PR-bound implementation work on `main`. If already on a non-`main` task branch, continue there unless the user asks for a new branch.
- Route AI requests through the backend proxy and keep the client safe when proxy env vars are missing.
- Run the most focused test or lint command that covers the change; run the full suite for shared-flow changes.
- Call out env, feature-flag, backup, auth, or release impacts in the final handoff.

## App Architecture

- Entry point: `App.tsx`
    - Loads the custom font.
    - Initializes logging.
    - Wraps the app in `AppErrorBoundary`.
- App shell: `src/screens/App/AppScreen.tsx`
    - Creates the appearance provider and safe-area context.
    - Chooses between auth flow and main app flow.
    - Owns onboarding modal visibility.
- Main orchestration hook: `src/hooks/useAppScreen.ts`
    - This is the primary state and side-effect hub.
    - Search, auth, favorites, search history, theme, onboarding, backup, and version label are coordinated here.
    - For cross-screen behavior changes, inspect this file first.
- Navigation:
    - Root tabs: `src/navigation/RootTabNavigator.tsx`
    - Auth stack: `src/screens/Auth/AuthNavigator.tsx`
    - Settings nested navigator: `src/screens/Settings/SettingsNavigator.tsx`

## Data And Service Boundaries

- Dictionary and AI client logic lives in `src/api/dictionary/*`.
- The AI proxy toggle is controlled by `src/config/openAI.ts`.
- Local backend proxy lives in `server/index.js`.
- Current app data storage is abstracted through `src/services/database/index.ts`.
    - Treat it as the source of truth for auth/session/favorites/search history behavior.
    - Do not assume Firebase or a real remote database is active unless the task explicitly adds it.
- Backup and restore behavior lives in `src/services/backup/*`.
    - Keep import/export compatible with the existing sealed backup formats.

## UI Conventions

- Use the path alias `@/` for imports from `src`.
- Follow the existing split by concern:
    - screen/component logic in `*.tsx`
    - styles in adjacent `*.styles.ts` files
    - types in adjacent `*.types.ts` files when needed
- Theme-aware styling should go through:
    - `useThemedStyles(...)`
    - `useAppAppearance()`
    - theme tokens from `src/theme/*`
- Prefer extending existing theme tokens and style factories over inline style objects.
- Preserve the current navigation and prop-driven screen structure instead of moving logic into many new global contexts.

## Strings And Localization

- Shared localized copy lives in `src/shared/i18n/index.ts`.
- Some screen copy also lives close to the feature in constants or component files.
- When adding user-facing text:
    - reuse the existing localization pattern if the feature is already localized
    - keep Korean copy consistent with the current tone
    - avoid duplicating the same string across multiple files

## Testing Expectations

- Put tests next to the feature under `__tests__` when possible.
- Use `@testing-library/react-native`.
- If a component depends on theme context, wrap it with `AppAppearanceProvider` as existing tests do.
- Mock Expo/native modules minimally and locally, following existing test patterns.
- For behavior changes:
    - add or update focused tests first if practical
    - run at least the affected test file
    - run full `npm test -- --watch=false` when the change touches shared flows

## Feature Flags And Env

- Feature flags are resolved in `src/config/featureFlags.ts` from Expo `extra` and env vars.
- `app.config.ts` derives profile defaults from `APP_ENV`.
- AI features must remain safe when proxy env vars are missing.
- Never commit real secrets from `.env` or `.env.local`.
- Relevant env vars:
    - `EXPO_PUBLIC_OPENAI_PROXY_URL`
    - `EXPO_PUBLIC_OPENAI_PROXY_KEY`
    - `EXPO_PUBLIC_AI_HEALTH_URL`
    - `EXPO_PUBLIC_FEATURE_GUEST_ACCOUNT_CTA`
    - `EXPO_PUBLIC_FEATURE_BACKUP_RESTORE`
    - `AI_PROXY_KEY`
    - `OPENAI_API_KEY`

## Release And CI Notes

- CI currently runs lint, full tests, a migration regression test, and a web export build.
- If you change release behavior, inspect:
    - `app.json`
    - `app.config.ts`
    - `eas.json`
    - `.github/workflows/ci.yml`
- Keep production-safe defaults intact for hidden or incomplete features.

## Working Rules For Agents

- Before major refactors, read the existing feature folder and nearby tests.
- Prefer small, local changes over broad rewrites.
- Preserve public function signatures unless the task requires changing them.
- When touching `useAppScreen.ts`, be careful about unintended regressions across auth, favorites, search, and settings.
- When changing backup, auth, or environment-gated AI behavior, update tests or add targeted regression coverage.
