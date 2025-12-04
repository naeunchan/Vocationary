// @ts-check
const path = require("path");

const { getDefaultConfig } = require("expo/metro-config");

const baseConfig = getDefaultConfig(path.resolve());

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
