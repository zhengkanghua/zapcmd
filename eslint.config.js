import js from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginVue from "eslint-plugin-vue";
import globals from "globals";

const vitestGlobals = globals.vitest ?? {};

export default tseslint.config(
  {
    ignores: ["dist/**", "coverage/**", "src-tauri/**", "node_modules/**"]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs["flat/essential"],
  {
    files: ["**/*.{ts,tsx,vue}"],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
        ecmaVersion: "latest",
        sourceType: "module",
        extraFileExtensions: [".vue"]
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        __APP_VERSION__: "readonly",
        __GITHUB_OWNER__: "readonly",
        __GITHUB_REPO__: "readonly"
      }
    },
    rules: {
      "no-console": "off",
      "no-duplicate-imports": "error",
      "vue/multi-word-component-names": "off",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_"
        }
      ]
    }
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/**/__tests__/**", "src/**/*.test.ts", "src/**/*.spec.ts"],
    rules: {
      complexity: ["error", 30],
      "max-lines-per-function": [
        "error",
        {
          max: 120,
          skipBlankLines: true,
          skipComments: true
        }
      ],
      "max-params": ["error", 5]
    }
  },
  {
    files: ["**/*.{test,spec}.ts", "**/__tests__/**/*.ts"],
    languageOptions: {
      globals: {
        ...vitestGlobals
      }
    }
  }
);
