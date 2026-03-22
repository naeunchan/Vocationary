# Review Loop UI Brief

## Goal

Home should answer "what should I do now?" in one glance, and the review session should keep the user focused on one word at a time until completion.

## Scope

- `PR3` only changes screen structure, hierarchy, and interaction on Home and Review.
- Review queue derivation, persistence, backup, and session logic stay in `PR2`.
- The current navigation structure stays intact.

## Home Direction

Home should become a 3-part stack:

1. Compact welcome header
2. High-priority "today's review" hero card
3. Secondary preview of queued words

### Home Content Priority

- `오늘의 리뷰`: due count, completed count, and a dominant primary CTA
- `복습 시작` or `계속하기`: primary action
- `저장된 단어 보기`: secondary action back to Favorites
- queued word preview: lightweight preview only, not a second dashboard

### Home Empty State

- If no words are eligible today, show a calm empty state that redirects users back to search/save.
- Recommended copy:
    - title: `오늘 바로 시작할 리뷰가 없어요`
    - body: `검색에서 단어를 저장하면 다음 복습이 여기에 표시돼요.`
    - action: `단어 찾으러 가기`

## Review Session Direction

The session should use a focused single-column layout:

1. Progress header
2. Word card
3. Bottom action bar

### Review Session Actions

Keep action labels short and explicit:

- `외웠어요`
- `다시 볼래요`
- `아직이에요`

Internal outcome mapping for `PR2` and `PR3`:

- `외웠어요` -> `easy`
- `다시 볼래요` -> `good`
- `아직이에요` -> `again`

### Review Session Rules

- Show one word at a time from the snapped queue.
- Keep the action bar in the thumb zone.
- Move to the next item immediately after a decision.
- End with a summary screen instead of dropping users back abruptly.

## Review Summary

Completion should show:

- completed item count
- remaining count if the session ended early
- correct / retry summary if available from `PR2`
- return actions:
    - `홈으로 돌아가기`
    - `저장된 단어 보기`

## Component Targets

- `src/screens/Home/HomeScreen.tsx`
- `src/screens/Home/components/HomeHeader.tsx`
- `src/screens/Home/components/SummaryCard.tsx`
- `src/screens/Home/components/FavoritesList.tsx`
- `src/screens/Home/styles/HomeScreen.styles.ts`
- `src/screens/Home/styles/SummaryCard.styles.ts`
- `src/screens/Review/ReviewSessionScreen.tsx`
- `src/screens/Review/components/ReviewProgressHeader.tsx`
- `src/screens/Review/components/ReviewWordCard.tsx`
- `src/screens/Review/components/ReviewActionBar.tsx`
- `src/screens/Review/components/ReviewSessionSummary.tsx`

## Interaction Notes

- Home CTA must be visually dominant over status summaries.
- Review actions must not rely on color alone to convey meaning.
- Progress should stay visible without pushing the word content below the fold on smaller screens.
- Large font sizes must still preserve one-thumb access to the primary actions.

## Copy Notes

- Keep the current short Korean tone.
- Reuse the existing memorization vocabulary: `외울`, `복습`, `터득`.
- Avoid inventing new study terms that compete with the existing state model.

## Accessibility And Responsive Behavior

- Maintain at least 44px tap targets.
- Keep card layouts single-column on narrow screens.
- Ensure empty, loading, and error states all expose a clear next action.

## Handoff To PR3

- `PR2` should expose a minimal Home-facing contract such as:
    - `reviewSummary`
    - `canStartReview`
    - `onStartReview`
    - `activeReviewSession`
- `PR3` should consume that contract and stay out of queue/persistence logic.
