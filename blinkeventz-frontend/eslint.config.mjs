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
      // Disable quote escaping requirement for faster development
      "react/no-unescaped-entities": "off",
      // Disable no-explicit-any for faster development (we'll fix types incrementally)
      "@typescript-eslint/no-explicit-any": "off",
      // Disable unused vars to warn instead of error
      "@typescript-eslint/no-unused-vars": "warn",
      // Disable React hooks purity checks for faster development
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);

export default eslintConfig;
