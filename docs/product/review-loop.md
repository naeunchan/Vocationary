# Review Loop RFC

## Problem

Vocachip currently helps users search and save words, but it does not yet give them a clear reason to return every day. Favorites already capture `toMemorize`, `review`, and `mastered` states, but those states are not yet connected to a predictable review queue or a session-based learning loop.

## Goals

- Turn saved words into a daily review loop with a clear "start review" action.
- Keep the queue derived from existing favorites/status data so search and save remain the entry point.
- Preserve the current navigation structure and use the existing app shell/session orchestration.
- Keep the experience local-first and compatible with existing backup/restore behavior.

## Non-goals

- Do not replace favorites with a separate collection system.
- Do not introduce remote sync or a new backend dependency.
- Do not change auth, guest, or search entry flows beyond what is needed for review start.
- Do not require a new navigation stack.

## User Flow

1. User saves a word from search into favorites.
2. App derives whether the word is eligible for review based on its current status.
3. Home shows today's review count and a primary "Start review" action.
4. User opens a review session from Home.
5. App snapshots the queue for that session and shows one word at a time.
6. User marks a word as learned, needs review, or not yet learned.
7. App updates the persisted status/progress and moves to the next queued word.
8. Session ends with a summary and a return path back to Home or Favorites.

## Review Queue Rules

- The queue is derived from the current user's favorites and status fields.
- Default eligible items are `toMemorize` and `review`.
- `mastered` items are excluded unless a future explicit "practice mastered" mode is enabled.
- Queue order should prefer `review` items before `toMemorize` items.
- Duplicate words must be deduplicated by normalized word key.
- The queue is snapshotted when the session starts and must not reshuffle while the session is active.
- Queue generation should be deterministic for the same source data and rules.
- Search remains the source of new vocabulary; review logic only consumes what is already saved.

## Review Session Lifecycle

- `idle`: no active review session.
- `ready`: queue is prepared and session can start.
- `active`: user is stepping through the snapshot queue.
- `complete`: all queued items are finished and a summary is available.
- `cancelled`: user exits early; partial progress should still persist for completed items.

Session rules:

- Starting a session captures the queue snapshot, start timestamp, and source counts.
- Each item completion updates progress immediately or at safe commit points, but must not mutate the active snapshot order.
- Completing a session updates the day's summary, streak/goal fields if enabled later, and the Home surface.
- Cancelling a session must keep completed-item updates and discard only the unfinished snapshot state.

## MVP Outcome Rules

These rules are the implementation baseline for `PR2`.

- `again`
    - set `status` to `toMemorize`
    - reset `correctStreak` to `0`
    - increment `incorrectCount`
    - set `nextReviewAt` to the next day
- `good`
    - move `toMemorize` to `review`
    - keep `review` as `review`
    - increment `reviewCount`
    - increment `correctStreak`
    - keep `incorrectCount` unchanged
    - set `nextReviewAt` to `+2 days`
- `easy`
    - move `toMemorize` to `review`
    - keep `review` as `review`
    - allow `review -> mastered` only when `correctStreak >= 2`
    - increment `reviewCount`
    - increment `correctStreak`
    - keep `incorrectCount` unchanged
    - set `nextReviewAt` to `+4 days`

## Proposed Data Model Fields

Keep the existing `favorites` shape intact and add review-specific fields beside it, not inside search history.

### Word-level fields

- `status`: existing `toMemorize | review | mastered`
- `updatedAt`: existing timestamp for status changes
- `reviewCount`: number of successful review completions
- `lastReviewedAt`: last successful review timestamp
- `nextReviewAt`: optional due timestamp for queue calculation
- `correctStreak`: consecutive successful answers
- `incorrectCount`: number of failed or retried answers

### User-level fields

- `dailyReviewGoal`: target number of completed review items per day
- `reviewStreak`: consecutive days with completed review activity
- `lastReviewCompletedAt`: last date a session was completed
- `reviewSessionCount`: total completed review sessions
- `reviewSummaryByDay`: lightweight daily summary used by Home

### Session-only fields

- `sessionId`
- `startedAt`
- `completedAt`
- `queueSnapshot`
- `totalCount`
- `completedCount`
- `correctCount`
- `incorrectCount`

## Feature Flags

Use feature flags so the loop can be released incrementally.

- `featureReviewLoop`: master gate for the review loop.
- `featureReviewHomeDashboard`: controls the Home review summary and primary CTA.
- `featureReviewSessionUi`: controls the dedicated review session UI.

Default behavior:

- Flags should default off until the implementation is validated.
- When flags are off, current search/favorites behavior must remain unchanged.
- AI features stay fail-closed and unrelated to this loop.

## Acceptance Criteria

- Home can show today's review count from current favorites/status data.
- A review session can start from Home without changing the navigation structure.
- The queue is derived from favorites/status data and is stable for the duration of a session.
- Session completion updates persisted review progress for the user.
- Search continues to be the entry point for adding words to favorites.
- Guest users keep local-only behavior with no remote dependency.
- Backup/restore remains compatible with the new fields or explicitly ignores them in a safe way.

## Validation / Release Checks

- Add focused tests for queue derivation, session lifecycle, and status updates.
- Add screen tests for the Home review CTA and the review session state transitions.
- Run the affected test files first, then run `npm test -- --watch=false` for shared-flow changes.
- Verify backup import/export compatibility if any persisted review fields are added.
- Confirm feature flags keep the new UI and session logic hidden by default.
- Confirm AI proxy behavior is unchanged and still fails closed when env vars are missing.

## Open Questions

- Should queue priority be purely status-based, or should `nextReviewAt` become the primary due rule once progress exists?
- Should `mastered` words ever re-enter the queue through a separate practice mode?
- Should review progress be included in backup payloads immediately, or added in a later migration?
- Is pausing/resuming a session required, or is cancel-and-restart sufficient for v1?
- Should daily goals and streaks be part of PR2/PR3, or deferred to a later PR?
- Should session summaries be persisted, or can they be computed from per-item progress only?
