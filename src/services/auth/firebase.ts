import AsyncStorage from "@react-native-async-storage/async-storage";
import { type FirebaseApp, type FirebaseOptions, initializeApp } from "firebase/app";
import {
    type Auth,
    deleteUser,
    getAuth,
    GoogleAuthProvider,
    initializeAuth,
    OAuthProvider,
    onAuthStateChanged,
    signInWithCredential,
    type User,
    type UserCredential,
} from "firebase/auth";
import { Platform } from "react-native";

type ReactNativePersistenceFactory = (storage: typeof AsyncStorage) => unknown;

let reactNativePersistenceFactory: ReactNativePersistenceFactory | null = null;
try {
    const rnAuth = require("firebase/auth/react-native") as {
        getReactNativePersistence?: ReactNativePersistenceFactory;
    };
    if (rnAuth.getReactNativePersistence) {
        reactNativePersistenceFactory = rnAuth.getReactNativePersistence;
    }
} catch {
    reactNativePersistenceFactory = null;
}

type FirebaseAuthConfig = {
    apiKey?: string;
    authDomain?: string;
    projectId?: string;
    appId?: string;
    messagingSenderId?: string;
    storageBucket?: string;
};

let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;

function getFirebaseConfigFromEnv(): FirebaseOptions {
    const config: FirebaseAuthConfig = {
        apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
        appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
        messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    };

    const requiredKeys: (keyof FirebaseAuthConfig)[] = ["apiKey", "authDomain", "projectId", "appId"];
    const missingKeys = requiredKeys.filter((key) => {
        const value = config[key];
        return typeof value !== "string" || value.trim().length === 0;
    });

    if (missingKeys.length > 0) {
        throw new Error(`Firebase 필수 설정이 누락됐어요: ${missingKeys.join(", ")}`);
    }

    return Object.entries(config).reduce((acc, [key, value]) => {
        if (typeof value === "string" && value.trim().length > 0) {
            return { ...acc, [key]: value };
        }
        return acc;
    }, {} as FirebaseOptions);
}

export function getFirebaseAuth(): Auth {
    if (!firebaseApp) {
        firebaseApp = initializeApp(getFirebaseConfigFromEnv());
    }
    if (!firebaseAuth) {
        if (Platform.OS !== "web" && reactNativePersistenceFactory) {
            try {
                firebaseAuth = initializeAuth(firebaseApp, {
                    persistence: reactNativePersistenceFactory(AsyncStorage),
                });
            } catch {
                firebaseAuth = getAuth(firebaseApp);
            }
        } else {
            firebaseAuth = getAuth(firebaseApp);
        }
    }
    return firebaseAuth;
}

export async function signInWithGoogleIdToken(idToken: string): Promise<UserCredential> {
    if (!idToken) {
        throw new Error("Google 토큰을 확인하지 못했어요.");
    }
    const auth = getFirebaseAuth();
    const credential = GoogleAuthProvider.credential(idToken);
    return await signInWithCredential(auth, credential);
}

export async function signInWithAppleIdToken(idToken: string, rawNonce: string): Promise<UserCredential> {
    if (!idToken) {
        throw new Error("Apple 토큰을 확인하지 못했어요.");
    }
    if (!rawNonce) {
        throw new Error("Apple nonce를 확인하지 못했어요.");
    }
    const auth = getFirebaseAuth();
    const provider = new OAuthProvider("apple.com");
    const credential = provider.credential({
        idToken,
        rawNonce,
    });
    return await signInWithCredential(auth, credential);
}

function normalizeFirebaseAuthError(error: unknown): Error {
    const code = typeof error === "object" && error !== null ? (error as { code?: string }).code : undefined;
    if (code === "auth/requires-recent-login") {
        return new Error("보안을 위해 다시 로그인한 뒤 계정을 삭제해주세요.");
    }
    if (error instanceof Error) {
        return error;
    }
    return new Error("Firebase 계정을 삭제하지 못했어요.");
}

export async function deleteFirebaseCurrentUser(): Promise<"deleted" | "no-user"> {
    const auth = getFirebaseAuth();
    const user = auth.currentUser;
    if (!user) {
        return "no-user";
    }
    try {
        await deleteUser(user);
        return "deleted";
    } catch (error) {
        throw normalizeFirebaseAuthError(error);
    }
}

export async function getFirebaseIdToken(): Promise<string | null> {
    try {
        const auth = getFirebaseAuth();
        const user = auth.currentUser;
        if (!user) {
            return null;
        }
        return await user.getIdToken();
    } catch {
        return null;
    }
}

export async function getFirebaseCurrentUserOnce(): Promise<User | null> {
    const auth = getFirebaseAuth();
    if (auth.currentUser) {
        return auth.currentUser;
    }

    return await new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(
            auth,
            (user) => {
                unsubscribe();
                resolve(user ?? null);
            },
            () => {
                unsubscribe();
                resolve(null);
            },
        );
    });
}
