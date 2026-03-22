---
name: develop
description: Implement features, bug fixes, refactors, tests, and repository code changes for Vocachip. Use when Codex needs to modify source files, update app behavior, wire data or UI logic, adjust tests, or run focused validation in this Expo React Native repository, including explicit /develop or $develop requests.
---

# Develop

Use this skill to carry implementation work from code inspection through validation for this repository.

## Workflow

1. Inspect the relevant feature folder, nearby tests, and boundary files before editing.
2. Default to the smallest coherent change that satisfies the request.
3. Preserve public signatures, navigation structure, theme patterns, auth behavior, backup behavior, and feature-flag behavior unless the request clearly requires a change.
4. Route AI behavior through the backend proxy and keep the client safe when proxy env vars are missing.
5. Run the narrowest useful validation command after editing. Use broader validation when shared flows are affected.

## Repository Guardrails

- Treat `src/hooks/useAppScreen.ts` as the main cross-screen orchestration point.
- Treat `src/services/database/index.ts` as the source of truth for auth, session, favorites, and search history behavior.
- Keep screen and component logic in `*.tsx`, styles in adjacent `*.styles.ts` files, and types in adjacent `*.types.ts` files when needed.
- Use the `@/` import alias for `src`.
- Prefer extending existing patterns over adding new global state or broad rewrites.

## High-Risk Areas

Add or update focused tests when the change touches:

- `src/hooks/useAppScreen.ts`
- auth or onboarding flows
- backup or restore behavior
- feature flags or environment-gated AI behavior
- release configuration or shared navigation flows

Run full `npm test -- --watch=false` when the change affects shared flows broadly. Otherwise run the most focused affected test or lint command.

## Useful Commands

- `npm run lint -- --max-warnings=0`
- `npm test -- --watch=false <path>`
- `npm test -- --watch=false`
- `npm run ci:build`

## Handoff

Report:

- what changed
- what was validated
- any remaining risk, env dependency, or release impact
