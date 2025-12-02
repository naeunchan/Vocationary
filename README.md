# Vocationary

> v1.0.0

## 주요 기능 (Korean)
- **회원가입 및 로그인**: 구글 계정 규칙을 반영한 아이디/비밀번호 검사와 닉네임 자동 생성으로 안전하고 간편하게 계정을 만들 수 있어요.
- **게스트 체험 모드**: 로그인 없이도 단어를 자유롭게 검색할 수 있으며, 즐겨찾기 저장은 10개까지 제한되어 있어요.
- **영영사전 검색**: 영영사전에서 단어 뜻을 조회하고(영한 모드는 준비 중), 오디오 발음은 백엔드 연동 시 사용할 수 있어요.
- **즐겨찾기 관리**: 사용자별로 단어를 저장하거나 삭제하면 로컬 SQLite DB에 동기화되어 세션이 바뀌어도 목록이 유지돼요.
- **홈 요약 대시보드**: 현재 로그인한 사용자, 사용 중인 사전 모드, 즐겨찾기 개수, 최근 검색어를 한눈에 보여줘요.
- **탭 내비게이션**: 홈, 즐겨찾기, 검색, 설정 네 개의 탭으로 주요 기능을 빠르게 이동할 수 있어요.
- **설정 화면**: 로그아웃하거나 초기 로그인 화면으로 되돌아갈 수 있어 계정 전환이 쉬워요.

## Key Features (English)
- **Sign Up & Login**: Enforces Google-style username/password rules, generates a fallback nickname, and keeps authentication simple and secure.
- **Guest Preview Mode**: Lets new users search freely without logging in while limiting favorites to 10 entries until they sign up.
- **Dictionary Search**: English-English definitions available; English-Korean mode is coming soon. Pronunciation audio works when a backend proxy is configured.
- **Favorites Management**: Save or remove words per user; everything is persisted locally with SQLite so favorites survive app restarts.
- **Home Summary Dashboard**: Highlights the signed-in profile, active dictionary mode, saved word count, and the most recent query at a glance.
- **Tabbed Navigation**: Home, Favorites, Search, and Settings tabs keep every major workflow just one tap away.
- **Settings Screen**: Provides a dedicated logout button and a quick path back to the login screen for easy account switching.

## Versioning
- `expo.version` and `ios.buildNumber` move together (e.g., `1.0.1` for the next release).
- `android.versionCode` starts at `1` and must be incremented for every Play Store upload.
- Update all three fields before cutting a new store build.

## Compliance & Security
- Privacy/Terms links live in `src/config/legal.ts` and currently use placeholders; replace with your hosted pages before store submission.
- Automatic login credentials are stored with SecureStore/Keychain on device; logout clears the secure entry.
- Optional biometric-gated auto-login is available via device capabilities (toggle in Settings).
- AI-powered examples/TTS require a backend proxy (`OPENAI_PROXY_URL`). Without it, the UI keeps the feature disabled and surfaces an in-app notice.
- No password recovery is provided; passwords are device-local. Set clear store copy or add a reset flow before launch.
