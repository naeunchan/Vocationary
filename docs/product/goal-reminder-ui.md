# Goal And Reminder UI Brief

## Scope

- PR5 targets goal and reminder UX only.
- Preserve the current Settings card layout and Home summary card language.
- Do not change review-domain logic, notification scheduling internals, or persistence shape in this pass.

## Target Screens And File Surface

- Existing: `src/screens/Settings/SettingsScreen.tsx`
- Existing: `src/screens/Settings/SettingsScreen.styles.ts`
- Existing: `src/screens/Home/HomeScreen.tsx`
- Existing: `src/screens/Home/components/SummaryCard.tsx`
- Existing: `src/screens/Home/styles/SummaryCard.styles.ts`
- New UI surface if needed: `src/screens/Settings/components/GoalSettingsCard.tsx`
- New UI surface if needed: `src/screens/Settings/components/ReminderSettingsCard.tsx`
- New UI surface if needed: `src/screens/Home/components/GoalProgressCard.tsx`

## Information Architecture

- Add a new Settings section between `일반` and `디스플레이`.
- Section label should be `학습 관리`.
- First card manages the daily goal.
- Second card manages reminder state, time, and repeat days.
- Home should surface progress without becoming a second settings screen.
- Preferred Home order: greeting, summary card, goal/streak strip, review/favorites content.

## Component Direction

- `GoalSettingsCard`
    - Row summary: current goal value or `목표 없음`
    - Tap opens a lightweight modal or bottom sheet with preset chips: `5개`, `10개`, `20개`, `직접 입력`
    - Secondary text explains goal unit in one line
- `ReminderSettingsCard`
    - Top row toggle: `리마인더 받기`
    - When enabled, show time row and repeat-days row
    - If OS permission is denied, keep the toggle visible but show a permission status row and deep-link CTA
- `GoalProgressCard` or compact Home strip
    - Show `오늘 목표`, `완료`, `연속 학습`
    - Keep this denser than the existing summary card so Home still prioritizes review start

## Interaction States

- Goal not set
    - Summary row shows `목표 없음`
    - Home strip shows `오늘 목표를 정해보세요`
- Goal set, no progress yet
    - Show `0 / N 완료`
    - Home CTA remains review-first
- Goal in progress
    - Show progress bar or filled chips, not both
    - Keep streak as a secondary badge
- Goal completed
    - Progress treatment switches to success tone
    - Optional helper line: `오늘 목표를 달성했어요`
- Reminder off
    - Card shows `꺼짐`
- Reminder on
    - Card shows `오후 9:00`, selected days, and next reminder summary if available
- Reminder permission denied
    - Status row shows `알림 권한 필요`
    - Primary CTA should be `설정에서 허용`

## Empty And Error States

- No goal yet
    - `아직 오늘 목표가 없어요. 부담 없는 숫자로 시작해보세요.`
- Reminder unavailable on device or permission blocked
    - `알림을 받으려면 기기 설정에서 권한을 허용해주세요.`
- Reminder save failure
    - Inline helper or alert copy: `알림 설정을 저장하지 못했어요. 다시 시도해주세요.`
- Home with no review items but goal set
    - Keep goal visibility and show review empty state separately

## Korean Copy Direction

- Keep the existing short, direct, polite tone.
- Prefer nouns and short action labels over explanatory sentences.
- Recommended labels:
    - `학습 관리`
    - `오늘 목표`
    - `연속 학습`
    - `리마인더 받기`
    - `알림 시간`
    - `반복 요일`
    - `설정에서 허용`
    - `오늘 목표를 달성했어요`
- Avoid motivational copy that feels louder than the rest of the app.

## Accessibility Notes

- Tap targets for goal chips, day chips, and reminder rows should stay at or above 44px.
- Do not communicate streak or completion only with color. Pair with numbers and labels.
- Large font mode must keep goal value, time, and repeat days readable without truncating the primary label.
- Toggle state and permission state need explicit accessibility labels.
- Home progress UI should collapse to a single column before text wraps into unreadable badges.

## Handoff To Develop

- Reuse existing section-card patterns from `SettingsScreen` rather than introducing a new page.
- Keep state wiring minimal: the UI should be able to render from `dailyGoal`, `completedToday`, `reviewStreak`, `reminderEnabled`, `reminderTime`, and `reminderDays`.
- If reminder permissions or repeat rules are not finalized, confirm the product policy before implementation.
