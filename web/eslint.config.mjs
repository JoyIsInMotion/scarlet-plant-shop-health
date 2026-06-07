import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // Intentional mount-once hydration / SSR-guard patterns (cart + auth
      // providers, client-only charts). The React Compiler rule is too strict
      // for these one-shot effects, so keep it a warning, not a build error.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);

export default eslintConfig;
