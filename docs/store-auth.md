# Store Auth Configuration (Firebase Auth + Local DB Mapping)

이 문서는 현재 앱의 인증 구조를 기준으로 작성되었습니다.

- 인증 소스: **Firebase Auth**
- 로컬 데이터 소스: **SQLite** (단어장/검색 기록/앱 설정)
- 사용자 매핑 키: `users.oauth_provider = "firebase"`, `users.oauth_sub = <firebase uid>`

---

## 1. Firebase Console 설정

1. Firebase 프로젝트 생성/선택
2. Authentication 활성화
    - Sign-in method > **Email/Password** 활성화
3. (선택) Authorized domains에 테스트 도메인/웹 도메인 추가
4. 프로젝트 설정에서 Web App 구성값 확인

필수 값:

- `apiKey`
- `authDomain`
- `projectId`
- `appId`
- `messagingSenderId`
- `storageBucket`
- `measurementId` (선택)

---

## 2. 앱 환경 변수

`app.config.ts`가 아래 값을 Expo `extra`로 주입합니다.

```bash
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID= # optional
```

---

## 3. 코드 구조

- `src/services/auth/firebaseClient.ts`
    - Firebase app/auth 초기화
    - React Native 환경에서 AsyncStorage persistence 적용
- `src/services/auth/firebaseAuth.ts`
    - 이메일 로그인/회원가입
    - 비밀번호 재설정 요청/확정
    - 로그아웃/계정삭제/비밀번호 변경
    - `onAuthStateChanged` 구독
- `src/hooks/useAppScreen.ts`
    - 인증 부트스트랩을 `onAuthStateChanged` 기반으로 처리
    - Firebase 사용자 -> 로컬 사용자 업서트/로딩
    - 게스트 단어장 병합 UX 유지

---

## 4. 로컬 사용자 매핑 정책

### 기본 규칙

- Firebase 사용자 로그인 성공 시:
    - `provider: "firebase"`
    - `subject: firebase uid`
    - `email: firebase email`
    - 위 값을 기준으로 로컬 사용자 매핑 업서트 수행

### 점진 마이그레이션(legacy local account)

기존 로컬 이메일/비밀번호 계정은 서버 계정이 아니므로 일괄 이전이 불가능합니다.

현재 정책:

1. 사용자가 로그인 시 Firebase 인증 실패(`user-not-found`/`invalid-credential`)가 나면,
2. 로컬 DB의 기존 비밀번호 해시 검증을 시도하고,
3. 일치하면 같은 이메일/비밀번호로 Firebase 계정을 생성하여 자동 전환합니다.

### 이메일 충돌 정책

- 동일 이메일에 이미 다른 소셜 identity가 연결된 경우: 충돌 오류 반환

---

## 5. 게스트 -> 회원 전환

- 게스트 모드 단어장은 로컬 preference(`experience.guest.favorites`)에 유지
- 회원 로그인 성공 시 최신 `updatedAt` 기준으로 병합
- 병합된 항목은 사용자 로컬 단어장(SQLite favorites)으로 업서트

---

## 6. QA 체크리스트

1. 이메일 회원가입 후 앱 재실행 시 세션 자동 복원
2. 이메일 로그인 성공/실패 메시지 확인
3. 게스트 단어장 병합 알림/개수 확인
4. 비밀번호 재설정 메일 발송 + oobCode 재설정 성공
5. 로그아웃/계정삭제 후 로컬 세션 정리 확인

세부 체크리스트:

- `docs/auth/firebase-console-checklist.md`
- `docs/auth/auth-qa-checklist.md`
