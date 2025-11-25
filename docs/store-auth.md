# Store Auth Configuration (Apple & Google Sign-In)

This app already supports email/password and guest access through the local SQLite layer. Because the previous “social login” UX was a fake local shortcut, it has been removed from production builds until real Apple/Google OAuth is wired up. The steps below outline how to safely re-enable those providers once the native/platform configuration is complete.

---

## 1. Apple Sign-In (iOS)

### App-side configuration

1. **Bundle Identifier**  
   `app.json` currently uses `com.anonymous.vocationary`. Update this to your production bundle identifier before release.

2. **Expo config / entitlements**  
   When building with EAS for iOS, ensure that `expo build` or `eas build` uses a credentials profile that enables *Sign in with Apple*.  
   - In `eas.json`, set `"ios": { "entitlements": { "com.apple.developer.applesignin": ["Default"] } }` once you have a real bundle ID.
   - If you add `expo-apple-authentication`, also follow its installation guide (`npx expo install expo-apple-authentication`) and wrap UI with `<AppleAuthenticationButton>` etc.

### Apple Developer Console steps (manual)

> **TODO for developer:** complete these steps in the Apple Developer portal.

1. **Create an App ID & enable Sign in with Apple**
   - Apple Developer → Certificates, Identifiers & Profiles → Identifiers → App IDs → enable *Sign in with Apple*.
2. **Create a Services ID**
   - Needed only if you plan to support web flows (`expo-auth-session`). For native-only flows you can rely on native capabilities.
3. **Configure Redirect URLs**
   - For AuthSession/web fallback: set `https://auth.expo.io/@your-username/your-slug`.
4. **Create a private key**
   - Apple Developer → Keys → Sign in with Apple. Download the `.p8` key and record the Key ID.
5. **Update EAS credentials**
   - In `eas credentials`, assign the key + service ID identifiers. Expo docs: https://docs.expo.dev/guides/sign-in-with-apple/

Add environment variables (e.g., `EXPO_PUBLIC_APPLE_CLIENT_ID`, `EXPO_PUBLIC_APPLE_REDIRECT_URI`) for use when wiring up the UI.

---

## 2. Google Sign-In (iOS + Android)

### App-side configuration

The project doesn’t yet include `expo-auth-session` or `@react-native-google-signin/google-signin`. Pick the provider that best matches your UX. We recommend `expo-auth-session` because it works on both platforms with minimal native code.

1. **Install the SDK (future step)**  
   `npx expo install expo-auth-session expo-web-browser`
2. **Configure reverse client ID for iOS**  
   - Once you obtain a Google OAuth Client ID (iOS type), add it to `app.json` under:
     ```json
     "ios": {
       "bundleIdentifier": "your.bundle.id",
       "googleServicesFile": "./GoogleService-Info.plist",
       "config": {
         "googleSignIn": {
           "reservedClientId": "com.googleusercontent.apps.XXXX"
         }
       }
     }
     ```
3. **Configure Android**  
   - Update `android.package` to the release package name.
   - If using `expo-auth-session`, set `androidClientId` with your OAuth client ID.
   - If using the native Google services JSON, add `"googleServicesFile": "./google-services.json"` to `android`.

### Google Cloud Console steps (manual)

> **TODO for developer:** run these steps in https://console.cloud.google.com/apis/credentials

1. **Create OAuth consent screen** (external or internal as needed).
2. **Create OAuth client IDs**
   - One “iOS” client with the bundle ID.
   - One “Android” client using the package name + SHA-1. Get SHA-1 by running `eas credentials` or `keytool -list -v -keystore`.
   - Optional: Web client for Expo web/`expo-auth-session`.
3. **Set redirect URIs**
   - For `expo-auth-session`: `https://auth.expo.io/@your-username/your-slug`.
4. **Download config files**
   - `GoogleService-Info.plist` → root directory.
   - `google-services.json` → root directory.

Update `.env` or `app.config` to expose:
```
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=
```

---

## 3. Wiring the UI (future work)

1. Install the chosen auth SDKs (`expo-apple-authentication`, `expo-auth-session`, etc.).
2. In `LoginScreen.tsx`, reintroduce a dedicated social-login entry point that calls the providers and forwards the verified profile/token to the server (or to a rebuilt client handler).
3. Remember to handle cases where Apple accounts don’t expose email/display name (prompt users to confirm).
4. Add fallbacks for devices where Apple/Google sign-in isn’t available (already partly covered by guest login).

Once console configuration and SDK wiring are complete, test both providers on physical devices, then update the App Store / Google Play listing screenshots accordingly.
