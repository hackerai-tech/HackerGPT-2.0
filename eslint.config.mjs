import tailwindcss from "eslint-plugin-tailwindcss";
import tsParser from "@typescript-eslint/parser";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({
    baseDirectory: import.meta.dirname,
    recommendedConfig: js.configs.recommended,
});

export default [
    ...compat.extends(
        "next/core-web-vitals",
        "next/typescript",
        "prettier",
        "plugin:tailwindcss/recommended"
    ),
    {
        plugins: {
            tailwindcss,
        },
        settings: {
            tailwindcss: {
                callees: ["cn", "cva"],
                config: "tailwind.config.js",
            },
            next: {
                rootDir: "./"
            }
        },
        rules: {
            "tailwindcss/no-custom-classname": "off",
            "@next/next/no-img-element": "error",
            "@next/next/no-html-link-for-pages": "error",
        },
    },
    {
        files: ["**/*.ts", "**/*.tsx"],
        languageOptions: {
            parser: tsParser,
        },
        rules: {
            "@typescript-eslint/no-explicit-any": "off",
            "prefer-const": "warn",
            "@next/next/no-img-element": "warn"
        }
    },
];
