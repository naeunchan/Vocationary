import { createRoute } from "@granite-js/react-native";
import React from "react";

import { VocachipMiniApp } from "../src/appsInToss/VocachipMiniApp";

export const Route = createRoute("/", {
    component: Page,
});

function Page() {
    return <VocachipMiniApp />;
}
