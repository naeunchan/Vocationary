---
name: pm
description: Plan features, bug fixes, refactors, releases, and project work for Vocachip before implementation. Use when Codex needs to clarify scope, break work into phases, identify file targets, call out risks and assumptions, or prepare an execution-ready plan in this repository, including explicit /pm or $pm requests.
---

# PM

Use this skill for planning-only work in this repository.

## Workflow

1. Inspect the relevant source files, nearby tests, and architectural boundaries before proposing work.
2. Clarify the goal, success criteria, and scope.
3. Call out assumptions, unknowns, dependencies, and rollout risks explicitly.
4. Prefer small, staged delivery over broad rewrites.
5. Stay in planning mode unless the user explicitly asks to switch into implementation.

## Planning Output

Structure plans around:

1. Goal
2. Scope
3. Assumptions and open questions
4. Recommended approach
5. Implementation phases
6. Risks and mitigations
7. Validation and release checks

## Repository-Specific Guardrails

- Treat `src/hooks/useAppScreen.ts` as the main cross-screen orchestration point.
- Treat `src/services/database/index.ts` as the source of truth for auth, session, favorites, and search history behavior.
- Preserve public APIs, navigation structure, theme patterns, backup behavior, auth behavior, and feature-flag behavior unless the request clearly requires a change.
- Highlight shared-flow impact when work touches auth, search, favorites, settings, backup, or release config.

## Task Breakdown Rules

- Make each task concrete and independently verifiable.
- Note likely file targets.
- Identify where tests should be updated.
- Include validation commands the implementer should run.

## Handoff

When preparing execution, include:

- a short summary
- ordered tasks
- likely file targets
- acceptance criteria
- validation commands

If the request is ambiguous enough to change scope materially, ask one short clarifying question.
