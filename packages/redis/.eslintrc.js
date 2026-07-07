/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  extends: ["@repo/eslint-config/library.js"],
  parser: "@typescript-eslint/parser",
  overrides: [
    {
      files: ["**/*.test.ts", "**/*.spec.ts"],
      env: { jest: true },
    },
  ],
};
