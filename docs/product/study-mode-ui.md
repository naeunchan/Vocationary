# Study Mode UI Brief

## Scope

- PR11 introduces AI study mode UI and the healthy, degraded, and unavailable states around it.
- Preserve the current Search-first entry flow and fail-closed AI behavior.
- Do not hide dictionary search or existing review flows when AI is unavailable.
- Keep this PR at the UI contract level unless product explicitly asks for new AI learning domain logic.

## Target Screens And File Surface

- Existing: `src/screens/Search/SearchScreen.tsx`
- Existing: `src/screens/Search/components/SearchResults.tsx`
- Existing: `src/screens/Settings/SettingsScreen.tsx`
- Existing: `src/screens/Search/SearchScreen.types.ts`
- Existing: `src/screens/Search/SearchScreen.styles.ts`
- Existing: `src/screens/Settings/SettingsScreen.styles.ts`
- New UI surface if needed: `src/screens/StudyMode/StudyModeScreen.tsx`
- New UI surface if needed: `src/screens/StudyMode/components/AIStatusBanner.tsx`
- New UI surface if needed: `src/screens/StudyMode/components/StudyModeCard.tsx`
- New UI surface if needed: `src/screens/StudyMode/components/StudyFallbackCard.tsx`
- Navigation impact if dedicated screen is chosen: `src/navigation/RootTabNavigator.tsx`, `src/components/AppNavigator/AppNavigator.tsx`
- Localization impact: `src/shared/i18n/index.ts`
- Optional rollout dependency if staged release is needed: `src/config/featureFlags.ts`

## Information Architecture

- Entry point should sit close to an already-found word, not as a standalone tab.
- Preferred entry order:
    - Search result
    - Study mode CTA
    - Dedicated Study Mode screen or focused panel
- Settings should expose status and recovery guidance, not the full study workflow.
- Study Mode screen should keep a simple top-down structure:
    - AI status banner
    - Current word/context card
    - Main study action card
    - Fallback or recovery card when needed

## Entry Contract

- No search result
    - Do not show a primary Study Mode CTA.
    - Search keeps only lightweight guidance copy.
- Search result available, healthy AI
    - Show a primary Study Mode CTA below the result card's pronunciation and examples area.
- Search result available, degraded AI
    - Keep the CTA visible.
    - Precede or accompany it with a degraded banner that explains limited availability before the user taps.
- Search result available, unavailable AI
    - Do not remove the entry affordance entirely.
    - Render a disabled or secondary CTA plus a fallback explanation and standard save/review path.
- Settings
    - Remains informational only.
    - It should never become the main place to start Study Mode.

## State Matrix

- Healthy
    - Full Study Mode CTA is enabled
    - Pronunciation and AI example flows look normal
    - Banner tone is neutral-positive, not celebratory
- Degraded
    - Study Mode entry stays visible
    - Show limited-state banner and reduced expectations before the user starts
    - Retry action stays close to the failed module, not hidden in Settings
- Unavailable
    - Study Mode CTA becomes disabled or secondary
    - Show what still works now: dictionary result, manual save, standard review
    - Offer one clear recovery path and one clear fallback path

## Component Direction

- `AIStatusBanner`
    - Shared tone across Search and Study Mode
    - Labels map directly to current status model: `활성`, `제한적`, `비활성`
- `StudyModeCard`
    - Shows the selected word, short instructions, and a primary action
    - Keep one dominant CTA only
- `StudyFallbackCard`
    - Used in degraded and unavailable states
    - Offers `다시 시도` and `사전 학습으로 계속` style actions
- Search result area
    - If a word is available, place Study Mode CTA below pronunciation/examples, not above the dictionary definition

## Fallback Rules

- Healthy
    - Primary CTA opens the dedicated Study Mode surface or focused panel.
    - Normal pronunciation and AI example affordances remain visible.
- Degraded
    - Study Mode remains reachable.
    - If the initial study request fails, keep the current word context on screen and swap only the study content area to an inline recovery state.
    - Offer `다시 시도` first and a non-AI fallback second.
- Unavailable
    - Disable or de-emphasize the AI-specific CTA rather than pretending the feature does not exist.
    - Show what still works: dictionary result, save-to-favorites, standard review.
    - Settings may explain the backend dependency, but the main fallback must stay inside Search or Study Mode.

## Interaction States

- No selected word yet
    - Hide the dedicated Study Mode screen entry
    - Keep only lightweight explanatory text in Search
- Loading study response
    - Use inline loading within the study card
    - Avoid a full-screen blocking spinner
- Healthy response loaded
    - Keep the word card stable and replace only the content area
- Degraded response
    - Surface partial availability explicitly before and after failure
    - Retry should preserve the current word context
- Unavailable
    - Disable AI-specific CTA and route the user to manual save/review

## Empty And Error States By Surface

- `src/screens/Search/SearchScreen.tsx`
    - Empty search: keep current placeholder and add no Study Mode affordance.
    - Result + unavailable AI: show status explanation without replacing the dictionary result.
- `src/screens/Search/components/SearchResults.tsx`
    - AI assist error: keep the result card visible and attach the degraded warning below it.
    - Retry action should stay inside the same result context.
- `src/screens/StudyMode/StudyModeScreen.tsx`
    - No selected word payload: show a guard state and return action to Search.
    - Failed generation: show inline failure with retry and fallback actions.
- `src/screens/Settings/SettingsScreen.tsx`
    - Only show status and recovery guidance.
    - Do not duplicate the Study Mode teaching flow here.

## Core Empty And Error Copy

- No word selected
    - `먼저 단어를 검색한 뒤 학습 모드를 시작해보세요.`
- AI temporarily degraded
    - `지금은 일부 AI 학습 기능만 이용할 수 있어요.`
- AI unavailable
    - `백엔드가 준비되면 AI 학습 모드를 사용할 수 있어요. 지금은 사전 검색과 일반 복습을 이용해주세요.`
- Generation failure
    - `학습 내용을 불러오지 못했어요. 다시 시도해주세요.`
- Retry exhausted
    - Keep fallback action visible instead of looping on the same error

## Korean Copy Direction

- Stay consistent with the current short explanatory tone in Search and Settings.
- Recommended labels:
    - `학습 모드`
    - `AI 학습 시작`
    - `다시 시도`
    - `사전 학습으로 계속`
    - `일부 기능만 이용 가능`
    - `백엔드 준비 필요`
- Avoid dramatic warning copy. The UI should feel informative, not alarming.

## Open Decisions Before Build

- Decide whether PR11 ships as an inline Search panel first or as a dedicated `StudyModeScreen`.
- Decide whether a dedicated feature flag such as `featureStudyModeUi` is needed for staged rollout.
- Confirm whether degraded state still allows partial AI output, or only retry plus fallback.
- Confirm whether `사전 학습으로 계속` points back to Search result content or to the existing review flow.

## Accessibility Notes

- Status must not rely on color alone. Pair each surface with text labels and iconography if icons are used.
- Disabled Study Mode CTA must still explain why it is unavailable.
- Retry and fallback actions need distinct accessibility labels so they are not read as identical buttons.
- Large text mode should keep the status banner above the fold without pushing the primary action off-screen.
- Screen reader order should announce status, current word, then available actions.

## Acceptance Criteria

- Search does not show a Study Mode primary CTA before a word result exists.
- When a word result exists and AI is healthy, the user can see and enter Study Mode from Search without losing the dictionary result context.
- When AI is degraded, Search or Study Mode clearly communicates limited availability and keeps a visible retry path near the failed module.
- When AI is unavailable, dictionary search, save, and standard review remain usable and visible.
- Settings shows AI status and recovery guidance using the same language as Search, without becoming the primary Study Mode entry.
- Disabled or degraded states are understandable without relying on color alone.
- Large text mode and screen readers can reach status, current word, primary action, and fallback action in a predictable order.

## Handoff To Develop

- Build healthy, degraded, and unavailable as explicit render branches driven by the existing AI status contract.
- Reuse Search and Settings status language so localization does not fork.
- If product wants a dedicated Study Mode screen, confirm navigation entry and return behavior before implementation.
