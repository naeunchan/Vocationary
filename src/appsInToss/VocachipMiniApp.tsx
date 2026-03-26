import React, { useCallback, useState } from "react";

import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import { initializeLogging } from "@/logging/logger";
import { AppScreen } from "@/screens/App/AppScreen";

export function VocachipMiniApp() {
    initializeLogging();

    const [appKey, setAppKey] = useState(0);
    const handleRestart = useCallback(() => {
        setAppKey((previous) => previous + 1);
    }, []);

    return (
        <AppErrorBoundary enabled={!__DEV__} onRestart={handleRestart}>
            <AppScreen key={appKey} />
        </AppErrorBoundary>
    );
}
