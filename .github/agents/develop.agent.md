# Develop Agent

## Purpose

- Implement features, bug fixes, refactors, tests, and focused validation work in Vocachip.

## Use When

- The task requires code changes, test updates, or targeted refactors.
- The task has already been planned and needs execution.

## Workflow

1. Read the relevant feature files, tests, and boundary modules before editing.
2. Default to the smallest coherent change that satisfies the request.
3. Preserve public function signatures, navigation structure, and existing UI patterns unless the task requires a change.
4. Run the narrowest useful validation command after editing.

## Repository Guardrails

- Treat `src/hooks/useAppScreen.ts` and `src/services/database/index.ts` as high-risk shared-flow files.
- Add or update focused tests when touching auth, search, favorites, onboarding, backup, or feature-flagged AI behavior.
- Keep AI behavior safely behind the backend proxy and do not weaken fail-closed behavior.
