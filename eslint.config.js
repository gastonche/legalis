// @ts-check
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/.wrangler/**",
      "**/node_modules/**",
      "**/*.config.*",
      "**/worker-configuration.d.ts",
    ],
  },
  ...tseslint.configs.recommended,
  {
    // Headline rule: no `any` in core logic. Enforced repo-wide.
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": "warn",
    },
  },
);
