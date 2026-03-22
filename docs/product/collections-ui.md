# Collections And Favorites UI Brief

## Scope

- PR8 redesigns save-to-collection flow and Favorites information architecture.
- Preserve Favorites as the study source of truth for review status.
- Do not turn collections into a replacement for review status or a new review engine in this pass.

## Target Screens And File Surface

- Existing: `src/screens/Search/SearchScreen.tsx`
- Existing: `src/screens/Search/components/SearchResults.tsx`
- Existing: `src/screens/Favorites/FavoritesScreen.tsx`
- Existing: `src/screens/Favorites/components/FavoritesFlashcard.tsx`
- Existing: `src/screens/Favorites/FavoritesScreen.styles.ts`
- Existing: `src/screens/Favorites/components/FavoritesFlashcard.styles.ts`
- New UI surface if needed: `src/screens/Search/components/SaveToCollectionSheet.tsx`
- New UI surface if needed: `src/screens/Favorites/components/CollectionFilterBar.tsx`
- New UI surface if needed: `src/screens/Favorites/components/CollectionSummaryCard.tsx`

## Information Architecture

- Search remains the place where a word is first saved.
- Favorites remains the place where saved words are browsed and reorganized.
- Save flow should ask two questions in one compact sheet:
    - Which learning status should this word start in?
    - Which collection should it belong to?
- Favorites screen should separate browsing context from word actions.
- Preferred Favorites order:
    - Hero summary
    - Collection filter row
    - Status filter row
    - Word list

## Component Direction

- `SaveToCollectionSheet`
    - Title: `어디에 저장할까요?`
    - Subtitle includes the current word
    - First block: status chips `외울`, `복습`, `터득`
    - Second block: collection list with the default collection first
    - Last row: `새 컬렉션 만들기`
- `CollectionFilterBar`
    - Horizontal chips for `전체` plus available collections
    - Keep it scrollable rather than wrapping into two rows
- `CollectionSummaryCard`
    - Shows active collection name, word count, and short helper copy
- `FavoritesFlashcard`
    - Keep per-word actions local: move status, move collection, remove
    - Avoid putting collection editing inside the same row as pronunciation controls

## Interaction States

- First save from Search
    - Default selected status is `외울`
    - Default selected collection is `기본 단어장`
- Save to existing collection
    - Primary CTA: `저장하기`
    - Success feedback should be brief and non-blocking
- Save word already stored in another collection
    - Explain whether this moves or duplicates
    - Preferred v1 behavior: move within the same save flow, avoid silent duplicates
- No custom collections yet
    - Show only `기본 단어장`
    - Keep `새 컬렉션 만들기` hidden if product scope does not include creation yet
- Favorites browsing
    - Collection choice persists while switching status tabs
    - Status filter should not reset the selected collection

## Empty And Error States

- No saved words at all
    - `저장한 단어가 아직 없어요. 검색 화면에서 단어를 저장해보세요.`
- Selected collection empty
    - `이 컬렉션에는 단어가 없어요. 다른 컬렉션을 보거나 새 단어를 저장해보세요.`
- Selected status empty within a collection
    - `이 단계의 단어가 없어요.`
- Collection creation or save failure
    - `저장하지 못했어요. 잠시 후 다시 시도해주세요.`
- Move/remove failure
    - Prefer inline toast or alert, not a blank state swap

## Korean Copy Direction

- Keep the existing learning-status terminology.
- Use `컬렉션` consistently once this IA is introduced.
- Recommended labels:
    - `어디에 저장할까요?`
    - `기본 단어장`
    - `새 컬렉션 만들기`
    - `컬렉션 이동`
    - `이 컬렉션에는 단어가 없어요`
    - `저장하기`
- Avoid mixing `즐겨찾기`, `단어장`, and `컬렉션` on the same action unless the relationship is explained in the surrounding UI.

## Accessibility Notes

- Bottom sheet must move focus to the title first and provide a clear close action.
- Status chips and collection chips need selected-state announcements for screen readers.
- Word rows should expose separate actions for `상태 변경`, `컬렉션 이동`, and `삭제`.
- Long collection names should truncate visually but remain fully announced via accessibility labels.
- On narrow screens, keep collection chips horizontally scrollable instead of shrinking text below readability.

## Handoff To Develop

- Wire the save sheet as an additive layer on top of the current favorite toggle, not a separate navigation flow.
- Keep the UI compatible with a fallback where only the default collection exists.
- Confirm product behavior for duplicate saves before implementation. The UI should not imply multi-save support unless it is actually supported.
