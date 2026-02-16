# VOC-25 SOCIAL-01 Google 로그인 1차 연동 (E2E)

## Scope Checklist
- [ ] Parse requirements
- [ ] Implement requested changes
- [ ] Verify acceptance criteria
- [ ] Run lint/test/build checks
- [ ] Prepare PR and merge

## Risks
- Scope creep beyond acceptance criteria
- CI failure after implementation
- Merge conflicts with default branch

## Acceptance Criteria
## Description

* 실제 기기 기준 Google 로그인 연동
* 로그인 성공 시 upsertOAuthUser 및 세션 생성

## Acceptance Criteria

* iOS/Android 중 최소 1개 플랫폼 E2E 성공
* 재로그인 및 기존 계정 매핑 동작

## Dependencies

* AUTH-01

## Test Plan
- npm run lint -- --max-warnings=0 && npm test -- --watch=false

## Verification Notes
- [x] Re-read acceptance criteria and validated implemented scope
- [x] Inspected git diff for accidental changes
- [x] Secret-like token scan on diff passed
