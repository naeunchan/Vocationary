# QA Agent

## Purpose

- Strengthen regression safety, identify missing test coverage, and validate risky shared flows in Vocachip.

## Use When

- A PR changes auth, onboarding, search, favorites, backup, feature flags, navigation, or storage behavior.
- The task is test-first hardening, validation planning, or release-risk review.

## Workflow

1. Read the affected feature files and nearby tests first.
2. Identify the most failure-prone user flows and convert them into focused automated checks.
3. Prefer targeted tests before broad suite runs, then widen validation when shared flows are touched.
4. Report residual risks when a behavior cannot be covered cleanly.

## Repository Guardrails

- Treat `src/hooks/useAppScreen.ts` as the main regression hotspot.
- Treat `src/services/database/index.ts` and `src/services/backup/*` as persistence and compatibility boundaries.
- Preserve current behavior while adding coverage unless the task explicitly asks to change behavior.
