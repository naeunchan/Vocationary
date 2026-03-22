---
name: architecture
description: Analyze architecture, technical boundaries, refactor direction, and migration strategy for Vocachip. Use when Codex needs to evaluate module boundaries, compare architectural options, plan extractions from shared state, assess cross-cutting changes, or provide senior-level system design guidance for this repository, including explicit /architecture or $architecture requests.
---

# Architecture

Use this skill for senior-level architecture analysis and decision support in this repository.

## Workflow

1. Inspect the relevant source files, adjacent tests, and architectural boundaries before making recommendations.
2. Define the problem, success criteria, and non-negotiable constraints.
3. Map the current ownership boundaries, coupling points, and failure modes.
4. Compare realistic options when tradeoffs matter.
5. Recommend the option with the best balance of maintainability, migration safety, delivery risk, and testability.
6. Stay in analysis and planning mode unless the user explicitly asks to switch into implementation.

## Output Structure

Structure architecture recommendations around:

1. Goal
2. Current state
3. Constraints and invariants
4. Options considered
5. Recommended architecture
6. File and module impact
7. Migration plan
8. Risks and validation

## Repository-Specific Guardrails

- Treat `src/hooks/useAppScreen.ts` as the highest-risk orchestration boundary. If proposing changes there, call out extraction seams and cross-flow regression risk.
- Treat `src/services/database/index.ts` as the source of truth for persisted auth, session, favorites, and search history behavior.
- Preserve navigation structure, backup compatibility, theme patterns, and feature-flag behavior unless the recommendation explicitly requires change.
- Keep AI behavior safely behind the backend proxy and preserve fail-closed client behavior when proxy env vars are missing.

## Decision Rules

- Prefer staged migrations over broad rewrites.
- Prefer bounded module ownership over shared implicit coupling.
- Call out rollback difficulty, testing scope, and operational risk when recommending architecture change.
- Make file targets and responsibility boundaries concrete enough that another engineer can execute the plan.

## Useful Boundaries

- `App.tsx`
- `src/screens/App/AppScreen.tsx`
- `src/hooks/useAppScreen.ts`
- `src/services/database/index.ts`
- `src/navigation/RootTabNavigator.tsx`
- `src/screens/Auth/AuthNavigator.tsx`
- `src/screens/Settings/SettingsNavigator.tsx`
- `src/config/featureFlags.ts`
- `src/config/openAI.ts`

## Clarification Rule

If a wrong assumption would materially change the recommendation, ask one short clarifying question before going deeper.
