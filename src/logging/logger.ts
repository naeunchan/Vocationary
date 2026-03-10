import * as Sentry from "@sentry/react-native";
import Constants from "expo-constants";

import type { AppError } from "@/errors/AppError";

let initialized = false;
let hasSentryDsn = false;

export function initializeLogging() {
    if (initialized) {
        return;
    }
    initialized = true;
    const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN ?? Constants.expoConfig?.extra?.sentryDsn;
    if (!dsn) {
        console.info("[logger] Sentry disabled (missing DSN).");
        return;
    }
    Sentry.init({
        dsn,
        enabled: !__DEV__,
        debug: __DEV__,
        tracesSampleRate: 0.1,
    });
    const appVersion = Constants.expoConfig?.version ?? Constants.expoConfig?.extra?.versionLabel;
    if (appVersion) {
        Sentry.setTag("app_version", String(appVersion));
    }
    hasSentryDsn = true;
}

export function captureException(error: unknown, context?: Record<string, unknown>) {
    if (hasSentryDsn) {
        if (context) {
            Sentry.addBreadcrumb({
                category: "error",
                level: "error",
                message: "app_exception",
                data: context,
            });
        }
        Sentry.captureException(error, { extra: context });
    } else {
        console.error("[logger] exception", error, context);
    }
}

export function captureAppError(error: AppError, context?: Record<string, unknown>) {
    const payload = {
        kind: error.kind,
        code: error.code,
        retryable: error.retryable,
        ...context,
    };
    captureException(error.cause ?? new Error(error.message), payload);
}

export function setUserContext(userId: number | string | null | undefined) {
    if (hasSentryDsn) {
        if (userId) {
            Sentry.setUser({ id: String(userId) });
        } else {
            Sentry.setUser(null);
        }
    }
}
