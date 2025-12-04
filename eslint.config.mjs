// @ts-check
import { FlatCompat } from "@eslint/eslintrc";
import importPlugin from "eslint-plugin-import";
import prettierPlugin from "eslint-plugin-prettier";
import simpleImportSortPlugin from "eslint-plugin-simple-import-sort";
import path from "node:path";

const compat = new FlatCompat({
    baseDirectory: path.resolve(),
});

export default [
    {
        ignores: ["node_modules", "dist", "android", "ios", "eslint.config.mjs"],
    },
    ...compat.extends(
        "universe/native",
        "universe/shared/typescript-analysis",
        "plugin:react-hooks/recommended",
        "plugin:import/recommended",
        "plugin:import/typescript",
        "prettier",
    ),
    {
        plugins: {
            import: importPlugin,
            prettier: prettierPlugin,
            "simple-import-sort": simpleImportSortPlugin,
        },
        languageOptions: {
            globals: {
                jest: "readonly",
            },
            ecmaVersion: "latest",
            parserOptions: {
                project: "./tsconfig.json",
                tsconfigRootDir: path.resolve(),
            },
        },
        rules: {
            "prettier/prettier": "error",
            "import/order": "off",
            "simple-import-sort/imports": "error",
            "simple-import-sort/exports": "error",
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
            "import/resolver": {
                node: {
                    extensions: [".js", ".jsx", ".ts", ".tsx"],
                },
                typescript: {
                    project: "./tsconfig.json",
                },
            },
        },
    },
];
