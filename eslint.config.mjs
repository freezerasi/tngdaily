import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

/**
 * eslint-config-next 16 ships flat configs, so they are spread directly rather
 * than loaded through FlatCompat.
 */
const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "next-env.d.ts",
      ".impeccable/**",
      ".agents/**",
      ".claude/**",
      "scripts/**/*.js",
      "scripts/**/*.mjs",
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // console.error is used for error-boundary digests only.
      "no-console": ["error", { allow: ["error", "warn"] }],
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["../../*"],
              message: "Use the @/ alias instead of deep relative imports.",
            },
          ],
        },
      ],
      // Service-role credentials are read once, in @/lib/env, which imports
      // `server-only`. Everything else must go through that module.
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "MemberExpression[object.object.name='process'][object.property.name='env'][property.name='SUPABASE_SERVICE_ROLE_KEY']",
          message:
            "Read service-role credentials through @/lib/env, which is server-only.",
        },
      ],
    },
  },
  {
    // The env module is the single sanctioned reader of raw process.env.
    files: ["src/lib/env.ts"],
    rules: { "no-restricted-syntax": "off" },
  },
];

export default eslintConfig;
