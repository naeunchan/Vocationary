---
name: design
description: Design and refine Vocachip screens, components, and UX flows within the current app patterns. Use when Codex needs to change layout, hierarchy, spacing, theme-aware styling, localized UI copy, or interaction details in this Expo React Native repository, including explicit /design or $design requests.
---

# Design

Use this skill to handle UI and UX changes while preserving the repository's current visual language and architecture.

## Workflow

1. Inspect the target screen, adjacent styles file, theme tokens, localization, and nearby tests before editing.
2. Default to preserving the current visual language unless the user explicitly asks for a broader redesign.
3. Improve hierarchy, spacing, readability, touch targets, and interaction clarity before adding decorative complexity.
4. Keep layouts working on both phone-sized screens and larger web widths where the app already supports them.
5. Run the narrowest useful validation command after editing and summarize visual and behavioral impact.

## Visual And System Guardrails

- Use `useThemedStyles(...)`, `useAppAppearance()`, and shared files in `src/theme/*` for theme-aware styling.
- Prefer extending shared theme tokens and reusable style factories over adding large inline style objects.
- Keep screen and component logic in `*.tsx`, styles in adjacent `*.styles.ts` files, and types in adjacent `*.types.ts` files when needed.
- Reuse the current localization pattern and avoid duplicating user-facing strings across files.
- Keep Korean copy consistent with the tone already used in the app.

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
- what changed behaviorally, if anything
- what was validated
- any remaining UI, accessibility, or responsive-layout risk
