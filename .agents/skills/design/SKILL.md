---
name: design
description: Design and refine Vocachip screens, components, and UX flows within the current app patterns. Use when Codex needs to improve layout, hierarchy, usability, interaction flows, information architecture, theme-aware styling, localized UI copy, or user guidance in this Expo React Native repository, including explicit /design or $design requests.
---

# Design

Use this skill to handle UI design, UX design, interaction flow, and usability improvements while preserving the repository's current visual language and architecture.

## Workflow

1. Inspect the target screen, adjacent styles file, theme tokens, localization, nearby tests, and the relevant user flow before editing.
2. If the user asks for a PR, or the task is clearly PR-bound, create or switch to a dedicated branch before making new edits. Use `codex/<short-task-name>` by default unless the user specifies otherwise.
3. Default to preserving the current visual language unless the user explicitly asks for a broader redesign.
4. Improve hierarchy, spacing, readability, touch targets, interaction clarity, and flow comprehension before adding decorative complexity.
5. Keep layouts working on both phone-sized screens and larger web widths where the app already supports them.
6. Run the narrowest useful validation command after editing and summarize visual and behavioral impact.

## Visual And System Guardrails

- Use `useThemedStyles(...)`, `useAppAppearance()`, and shared files in `src/theme/*` for theme-aware styling.
- Prefer extending shared theme tokens and reusable style factories over adding large inline style objects.
- Keep screen and component logic in `*.tsx`, styles in adjacent `*.styles.ts` files, and types in adjacent `*.types.ts` files when needed.
- Reuse the current localization pattern and avoid duplicating user-facing strings across files.
- Keep Korean copy consistent with the tone already used in the app.

## UX Responsibilities

- Improve navigation clarity, task flow, and step-to-step guidance when a screen or flow feels confusing.
- Reduce avoidable friction in onboarding, auth, settings, and other multi-step interactions.
- Make empty states, error states, and recovery paths clear enough that the next action is obvious.
- Favor interaction models that are easy to learn, easy to scan, and easy to extend over clever one-off UI ideas.

## Behavior And Test Guardrails

Update focused tests when the design change also affects:

- navigation
- onboarding or auth flows
- settings or backup UI
- feature-flagged UI
- shared cross-screen behavior in `src/hooks/useAppScreen.ts`

If the work changes shared behavior broadly, run full `npm test -- --watch=false`. Otherwise run the most focused affected test or lint command.

## Useful References

- `src/theme/constants.ts`
- `src/theme/colors.ts`
- `src/theme/typography.ts`
- `src/theme/useThemedStyles.ts`
- `src/shared/i18n/index.ts`
- `src/screens/Search/SearchScreen.styles.ts`

## Handoff

Report:

- what changed visually
- what changed behaviorally or flow-wise, if anything
- what was validated
- any remaining UI, accessibility, or responsive-layout risk
