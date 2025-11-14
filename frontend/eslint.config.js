import globals from "globals";
import tseslint from "typescript-eslint";
import nextPlugin from "@next/eslint-plugin-next";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    ignores: [".next", "dist", "node_modules"],
  },
  {
    files: ["**/*.{ts,tsx}", "**/*.tsx"],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
    extends: [
      ...tseslint.configs.strict,
      nextPlugin.configs["core-web-vitals"],
    ],
  },
]);
