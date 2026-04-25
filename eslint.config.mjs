import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    files: [
      "src/app/desktop/**/*.{ts,tsx}",
      "src/components/desktop/**/*.{ts,tsx}",
      "src/components/library/**/*.{ts,tsx}",
      "src/lib/agents/**/*.ts",
      "src/lib/library/**/*.ts",
      "src/lib/markdown/**/*.ts",
      "src/lib/meetings/**/*.ts",
      "src/lib/export/**/*.ts",
      "src/lib/tauri/**/*.ts",
    ],
    rules: {
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "react-hooks/exhaustive-deps": "warn",
      // Standard "hydrate from localStorage on mount" pattern. Refactoring to
      // useSyncExternalStore is a separate cleanup, not pre-launch polish.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);

export default eslintConfig;
