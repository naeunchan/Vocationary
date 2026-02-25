# Auth QA Checklist (Firebase + Local Mapping)

## A. Email Auth

- [ ] 회원가입 성공: 이메일/비밀번호/이름/전화 입력 후 로그인 상태 진입
- [ ] 회원가입 실패: 중복 이메일, 약한 비밀번호, 네트워크 오류 메시지 확인
- [ ] 로그인 성공: 기존 Firebase 계정으로 로그인 가능
- [ ] 로그인 실패: 잘못된 비밀번호/없는 계정 메시지 확인

## B. Legacy Local -> Firebase Migration

- [ ] 기존 로컬 계정(비밀번호 해시 보유)으로 로그인 시 Firebase 계정 자동 생성/전환
- [ ] 전환 후 로컬 `users.oauth_provider = firebase` 및 `oauth_sub = firebase uid` 매핑 확인
- [ ] 이메일 충돌 케이스(이미 다른 인증 identity 연결)에서 충돌 메시지 확인

## C. Session Restore / Logout

- [ ] 앱 종료 후 재실행 시 `onAuthStateChanged` 기반 세션 복원
- [ ] 로그아웃 시 인증 상태 초기화 + 로컬 세션 정보 정리
- [ ] 로그아웃 후 재실행 시 비로그인 상태 유지

## D. Password Reset

- [ ] 재설정 메일 요청 성공
- [ ] 잘못된 이메일 요청 시 에러 메시지
- [ ] 재설정 링크의 `oobCode` 또는 링크 전체 입력으로 비밀번호 변경 성공
- [ ] 만료/잘못된 코드 오류 메시지 확인

## E. Guest -> Member Merge

- [ ] 게스트로 저장한 단어장 존재 상태에서 회원 로그인
- [ ] 병합 완료 알림 노출 및 병합 개수 정확성 확인
- [ ] 병합 후 중복 없는 최신 `updatedAt` 기준 적용 확인
- [ ] 병합 후 앱 재실행 시 데이터 유지 확인

## F. Account Management

- [ ] 비밀번호 변경 성공/실패(재로그인 필요 포함) 메시지 확인
- [ ] 계정 삭제 시 Firebase 계정 + 로컬 데이터 삭제 흐름 확인
- [ ] 삭제 후 재실행 시 비로그인/빈 데이터 상태 확인

## G. Regression (Non-auth)

- [ ] 단어 검색/즐겨찾기/검색기록 기본 기능 회귀 없음
- [ ] 설정(테마/폰트/온보딩/법적문서) 동작 회귀 없음
- [ ] 네트워크 오프라인 상태에서 인증 관련 오류 메시지 UX 확인
