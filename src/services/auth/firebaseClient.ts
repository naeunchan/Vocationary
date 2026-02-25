import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { FirebaseApp, FirebaseOptions, getApp, getApps, initializeApp } from "firebase/app";
import { Auth, getAuth, initializeAuth, Persistence } from "firebase/auth";
import { Platform } from "react-native";

type ReactNativeAuthModule = {
    getReactNativePersistence?: (storage: typeof AsyncStorage) => Persistence;
};

function readString(value: unknown): string {
    return typeof value === "string" ? value.trim() : "";
}

function resolveConfigValue(extraKey: string, envKey: string): string {
    const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;
    const fromExtra = readString(extra[extraKey]);
    const fromEnv = readString(process.env[envKey]);
    return fromEnv || fromExtra;
}

function resolveFirebaseOptions(): FirebaseOptions {
    return {
        apiKey: resolveConfigValue("firebaseApiKey", "EXPO_PUBLIC_FIREBASE_API_KEY"),
        authDomain: resolveConfigValue("firebaseAuthDomain", "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN"),
        projectId: resolveConfigValue("firebaseProjectId", "EXPO_PUBLIC_FIREBASE_PROJECT_ID"),
        appId: resolveConfigValue("firebaseAppId", "EXPO_PUBLIC_FIREBASE_APP_ID"),
        messagingSenderId: resolveConfigValue("firebaseMessagingSenderId", "EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"),
        storageBucket: resolveConfigValue("firebaseStorageBucket", "EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET"),
        measurementId: resolveConfigValue("firebaseMeasurementId", "EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID") || undefined,
    };
}

function validateFirebaseOptions(options: FirebaseOptions): FirebaseOptions {
    if (!options.apiKey || !options.projectId || !options.appId) {
        throw new Error("Firebase 설정이 누락됐어요. EXPO_PUBLIC_FIREBASE_* 환경 변수를 확인해주세요.");
    }
    return options;
}

let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;

function resolveReactNativePersistence() {
    const reactNativeModule = require("@firebase/auth/react-native") as ReactNativeAuthModule;
    if (typeof reactNativeModule.getReactNativePersistence !== "function") {
        throw new Error("Firebase Auth React Native persistence를 불러오지 못했어요.");
    }
    return reactNativeModule.getReactNativePersistence(AsyncStorage);
}

export function getFirebaseApp(): FirebaseApp {
    if (appInstance) {
        return appInstance;
    }

    if (getApps().length > 0) {
        appInstance = getApp();
        return appInstance;
    }

    const options = validateFirebaseOptions(resolveFirebaseOptions());
    appInstance = initializeApp(options);
    return appInstance;
}

export function getFirebaseAuth(): Auth {
    if (authInstance) {
        return authInstance;
    }

    const app = getFirebaseApp();
    if (Platform.OS === "web") {
        authInstance = getAuth(app);
        return authInstance;
    }

    try {
        authInstance = initializeAuth(app, {
            persistence: resolveReactNativePersistence(),
        });
    } catch (error) {
        const code = typeof (error as { code?: unknown })?.code === "string" ? (error as { code: string }).code : "";
        if (code === "auth/already-initialized") {
            authInstance = getAuth(app);
        } else {
            authInstance = getAuth(app);
        }
    }

    return authInstance;
}

export function isFirebaseConfigured(): boolean {
    try {
        validateFirebaseOptions(resolveFirebaseOptions());
        return true;
    } catch {
        return false;
    }
}
