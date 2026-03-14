import * as Sentry from "@sentry/react-native";
import Constants from "expo-constants";

import type { AppError } from "@/errors/AppError";

let initialized = false;
let hasSentryDsn = false;

function getSentryExtras(context?: Record<string, unknown>) {
    if (!context) {
        return null;
    }

    const entries = Object.entries(context).filter(([, value]) => value !== undefined);
    if (entries.length === 0) {
        return null;
    }

    return Object.fromEntries(entries);
}

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
        const extras = getSentryExtras(context);
        if (extras) {
            Sentry.addBreadcrumb({
                category: "error",
                level: "error",
                message: "app_exception",
                data: extras,
            });
            Sentry.withScope((scope) => {
                scope.setExtras(extras);
                Sentry.captureException(error);
            });
            return;
        }
        Sentry.captureException(error);
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
