# Firebase Console Checklist

## 1. Project Setup

- [ ] Firebase 프로젝트 생성/선택
- [ ] 앱 프로젝트 식별자(ios bundle id / android package)와 실제 빌드 설정 일치 확인
- [ ] 프로젝트 설정 > 일반 > Web App 구성값 확보

필수 값:

- [ ] `apiKey`
- [ ] `authDomain`
- [ ] `projectId`
- [ ] `appId`
- [ ] `messagingSenderId`
- [ ] `storageBucket`

선택 값:

- [ ] `measurementId`

## 2. Authentication Providers

- [ ] Authentication > Sign-in method > Email/Password 활성화

## 3. Authentication Settings

- [ ] Authentication > Settings > Authorized domains 점검
- [ ] 비밀번호 재설정 이메일 템플릿 기본 동작 확인
- [ ] 사용자 계정 생성/로그인 제한 정책(필요 시) 검토

## 4. Firebase Auth 연동 검증

- [ ] 테스트 계정으로 Email sign-up/sign-in 성공
- [ ] Password reset email 발송/링크 처리 성공
- [ ] `onAuthStateChanged`로 앱 재실행 시 세션 복원 확인

## 5. Security & Ops (권장)

- [ ] Authentication 이벤트 모니터링(로그인 실패/차단 등)
- [ ] 필요 시 App Check/Rate limit 정책 검토
- [ ] 운영/개발 프로젝트 분리 여부 확인
