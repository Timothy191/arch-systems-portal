/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  ignorePatterns: [
    "public/",
    "coverage/",
    "_app_legacy_shadow/",
    "_features_legacy_shadow/",
    "src.backup/",
    ".eslintrc.js",
    "jest.config.js",
    "postcss.config.mjs",
    "next.config.mjs",
    "storybook.d.ts",
    "components/",
    "features/",
    "hooks/",
    "lib/",
    "plugins/",
  ],
  extends: ["@repo/eslint-config/next"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: true,
  },
  overrides: [
    {
      files: ["scripts/*.js"],
      env: { node: true },
      parserOptions: {
        project: null,
      },
      rules: {
        "no-console": "off",
      },
    },
    {
      files: ["**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts", "**/setupTests.ts"],
      env: { jest: true },
      rules: {
        "@typescript-eslint/no-require-imports": "off",
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-unsafe-function-type": "off",
      },
    },
    {
      files: ["lib/env.ts", "lib/ai/tools.ts"],
      rules: {
        "no-restricted-imports": "off",
      },
    },
  ],
};
