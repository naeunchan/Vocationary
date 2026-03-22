# AI Study Mode Brief

## Problem

Vocachip already uses the proxy-backed AI path for example generation and pronunciation, but it does not yet turn that capability into a focused study surface. The next step is not a general chat feature. It is a bounded study mode that uses the existing dictionary data and proxy health model to generate objective practice cards.

## Scope

Ship a bounded study mode for a single word or a short queued set of saved words.

Included in v1:

- launch from an existing saved or searched word
- objective quiz cards with deterministic client-side progression
- retry/regenerate when the proxy is available
- degraded and unavailable states that match the current AI health model

Out of scope for v1:

- free-form chat tutor
- server-side user history or progress storage
- deck sharing or sync
- direct client calls to OpenAI

## Fail-Closed Constraints

- Study mode must remain hidden or disabled when `OPENAI_FEATURE_ENABLED` is false.
- The client must never call OpenAI directly; all generation must go through the existing proxy pattern with `x-api-key`.
- If proxy URL or proxy key is missing, the feature must behave as `unavailable`, not partially enabled.
- `useAIStatus` remains the health source:
    - `healthy`: normal entry and generation flow
    - `degraded`: show warning UI and allow explicit retry
    - `unavailable`: hide study entry points or show a non-interactive unavailable state
- Existing search, favorites, and review flows must continue to work when study mode is off.

## Quiz Types

Use a narrow first set of card types so the server contract stays predictable.

- `cloze`
    - AI returns a short example sentence with the target word omitted.
    - Client evaluates against the target word.
- `definition-choice`
    - Client shows one correct definition and multiple distractors.
    - Distractors should come from server-generated structured output, not client prompt guessing.
- `usage-check`
    - AI returns one correct usage and one incorrect or mismatched usage.
    - Client presents a binary choice.

V1 should keep answers objectively checkable on the client. Avoid open-ended grading.

## Server / Client Boundaries

Client responsibilities:

- gate entry points with feature flags and `OPENAI_FEATURE_ENABLED`
- read proxy health through `useAIStatus`
- launch and render the study session UI
- own card progression, local scoring, retry, and exit behavior
- reuse existing `/dictionary/tts` for optional pronunciation playback

Server responsibilities:

- expose a dedicated structured endpoint for study card generation
- own prompt construction, model choice, schema validation, and rate limiting
- return typed JSON only
- never persist user study sessions

Recommended endpoint:

- `POST /study/cards`

Recommended request shape:

- `word`
- `mode`
- `cardTypes`
- optional `context` built from dictionary meanings already available on the client

Recommended response shape:

- `cards: StudyCard[]`
- each card carries a stable `type`, prompt payload, answer payload, and optional explanation

## Release Flags

- `featureAiStudyMode`: master gate for the entire feature
- `featureAiStudyEntryPoints`: controls Search/Favorites launch affordances
- `featureAiStudySessionUi`: controls the dedicated study screen

Release policy:

- all three default off
- enable `featureAiStudyMode` only when proxy health, retry policy, and typed server response are implemented
- enable entry points only after degraded and unavailable states are designed and tested

## Acceptance Criteria

- Study mode is fully hidden or disabled when proxy configuration is missing.
- All AI generation goes through the proxy and respects the current API key and rate-limit pattern.
- The client can render at least the three defined card types from a structured response.
- A degraded proxy state does not crash the flow and offers an explicit retry path.
- An unavailable proxy state does not expose a broken CTA.
- Existing example generation and pronunciation features continue to work unchanged.

## Validation / Release Checks

- Add server tests or focused validation for the study-card response schema.
- Add client tests for healthy, degraded, and unavailable entry states.
- Add session tests for retry, regenerate, and exit flows.
- Run `npm test -- --watch=false` because Search, AI gating, and Settings health surfaces are shared flows.
- Verify rate limit behavior and response-time expectations before enabling flags outside local development.

## Open Questions

- Should v1 launch from Search only, or also from Favorites and the future review session?
- Should degraded mode allow starting a session with cached cards only, or only show retry?
- How many cards should one request generate by default?
- Should `definition-choice` distractors come entirely from the server, or can some be derived from dictionary data on the client?
- Does v1 need audio-based cards, or is reuse of pronunciation playback sufficient?
