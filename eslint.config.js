// Flat config for ESLint v9
import js from "@eslint/js";
import tsParser from "@typescript-eslint/parser";
import globals from "globals";

export default [
  // Always ignore build artifacts and deps
  { ignores: ["**/dist/**", "**/.next/**", "**/node_modules/**"] },

  js.configs.recommended,

  {
    files: ["**/*.{js,jsx,ts,tsx}"]
  },

  // TypeScript parsing and common globals
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        project: false
      },
      globals: {
        ...globals.node,
        ...globals.browser
      }
    },
    rules: {
      "no-console": "off"
    }
  },
  // Configure Node globals for CommonJS config files like next.config.js
  {
    files: ["**/*.config.js"],
    languageOptions: {
      globals: {
        ...globals.node
      }
    }
  }
];


