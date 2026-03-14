// @ts-check
const path = require("path");

const { getSentryExpoConfig } = require("@sentry/react-native/metro");

const baseConfig = getSentryExpoConfig(path.resolve());

const resolver = baseConfig.resolver ?? { assetExts: [], sourceExts: [] };
const assetExts = resolver.assetExts ? [...resolver.assetExts] : [];
const sourceExts = resolver.sourceExts ? [...resolver.sourceExts] : [];

if (!assetExts.includes("wasm")) {
    assetExts.push("wasm");
}

module.exports = {
    ...baseConfig,
    resolver: {
        ...resolver,
        assetExts,
        sourceExts: sourceExts.filter((ext) => ext !== "wasm"),
        unstable_enablePackageExports: false,
    },
};
