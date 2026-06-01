import js from "@eslint/js";
import tseslint from "typescript-eslint";

/**
 * Flat ESLint config for a TypeScript + Next.js project. Strict type checking
 * is enforced separately by `npm run typecheck` (tsc --noEmit); this lints for
 * common JS/TS mistakes without type-aware rules (fast, no project service).
 */
export default tseslint.config(
  {
    ignores: ["node_modules/**", ".next/**", "prisma/migrations/**", "next-env.d.ts"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // tsc + the unused-imports patterns we already follow cover these; relax
      // the noisiest rules so lint stays a useful, low-friction signal.
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "no-empty": "off",
      "no-undef": "off", // TS types + Node/Next globals; tsc is the source of truth
    },
  }
);
