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
    "coverage/**",
  ]),
  {
    rules: {
      // ===========================================
      // TypeScript Rules
      // ===========================================
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        {
          prefer: "type-imports",
          fixStyle: "inline-type-imports",
        },
      ],
      "@typescript-eslint/no-import-type-side-effects": "error",

      // ===========================================
      // General JavaScript Rules
      // ===========================================
      "prefer-const": "warn",
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "func-style": ["warn", "declaration", { allowArrowFunctions: false }],
      quotes: ["warn", "double", { avoidEscape: true, allowTemplateLiterals: true }],

      // Object/Array style
      "object-shorthand": ["warn", "always"],
      "prefer-destructuring": [
        "warn",
        {
          array: false,
          object: true,
        },
      ],

      // Prevent common mistakes
      "no-duplicate-imports": "error",
      "no-template-curly-in-string": "warn",
      "no-unreachable-loop": "error",
      "no-constant-binary-expression": "error",

      // ===========================================
      // React Rules
      // ===========================================
      "react/jsx-no-leaked-render": ["warn", { validStrategies: ["ternary", "coerce"] }],
      "react/self-closing-comp": ["warn", { component: true, html: true }],
      "react/jsx-curly-brace-presence": ["warn", { props: "never", children: "never" }],
      "react/hook-use-state": "warn",

      // ===========================================
      // Import Rules
      // ===========================================
      "import/first": "error",
      "import/newline-after-import": "warn",
      "import/no-anonymous-default-export": "warn",
    },
  },
]);

export default eslintConfig;
