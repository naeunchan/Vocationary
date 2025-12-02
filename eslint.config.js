// @ts-check
import { FlatCompat } from "@eslint/eslintrc";
import prettierPlugin from "eslint-plugin-prettier";
import path from "node:path";

const compat = new FlatCompat({
    baseDirectory: path.resolve(),
});

export default [
    {
        ignores: ["node_modules", "dist", "android", "ios"],
    },
    ...compat.extends(
        "universe/native",
        "universe/shared/typescript-analysis",
        "plugin:react-hooks/recommended",
        "prettier",
    ),
    {
        plugins: {
            prettier: prettierPlugin,
        },
        languageOptions: {
            globals: {
                jest: "readonly",
            },
            parserOptions: {
                project: "./tsconfig.json",
                tsconfigRootDir: path.resolve(),
            },
        },
        rules: {
            "prettier/prettier": "error",
            "node/handle-callback-err": "off",
            "no-void": "off",
            "react-hooks/exhaustive-deps": "off",
            "@typescript-eslint/no-floating-promises": "off",
            "@typescript-eslint/only-throw-error": "off",
            "@typescript-eslint/no-unused-vars": "off",
            "@typescript-eslint/prefer-nullish-coalescing": "off",
            "@typescript-eslint/prefer-optional-chain": "off",
            "@typescript-eslint/no-confusing-void-expression": "off",
        },
        settings: {
            react: {
                version: "detect",
            },
        },
    },
];
