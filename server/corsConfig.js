function parseOriginList(value) {
    return String(value || "")
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean);
}

function buildAppsInTossOrigins(appName) {
    const normalizedAppName = typeof appName === "string" ? appName.trim().toLowerCase() : "";
    if (!normalizedAppName) {
        return [];
    }

    return [`https://${normalizedAppName}.apps.tossmini.com`, `https://${normalizedAppName}.private-apps.tossmini.com`];
}

function getAllowedCorsOrigins({ configuredOrigins = "", appName = "" } = {}) {
    return Array.from(new Set([...parseOriginList(configuredOrigins), ...buildAppsInTossOrigins(appName)]));
}

function createCorsOriginResolver({ allowedOrigins = [], isProduction = false } = {}) {
    const allowedOriginSet = new Set(allowedOrigins);

    return (origin, callback) => {
        if (!origin) {
            callback(null, true);
            return;
        }

        if (allowedOriginSet.size === 0) {
            callback(null, !isProduction);
            return;
        }

        callback(null, allowedOriginSet.has(origin));
    };
}

module.exports = {
    buildAppsInTossOrigins,
    createCorsOriginResolver,
    getAllowedCorsOrigins,
    parseOriginList,
};
