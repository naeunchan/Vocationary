# fix/blocker-02-firebase-account-deletion

## Blocker
- Title: OAuth/Firebase 계정 삭제 컴플라이언스 미충족
- Why: Firebase OAuth 사용 시 계정 삭제가 로컬 DB만 삭제하면 스토어 정책의 “계정 삭제” 요건을 충족하지 못할 수 있음.

## Plan
- [x] Firebase current user 삭제 API 추가
- [x] 계정 삭제 플로우에서 Firebase 사용자 삭제 수행
- [x] Run checks (lint/test/build if available)

## Evidence
See audit/REPORT.md (Blocker #1: account deletion compliance).
