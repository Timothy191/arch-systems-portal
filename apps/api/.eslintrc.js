/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  ignorePatterns: ["dist/", "node_modules/", "coverage/"],
  extends: ["@repo/eslint-config/library.js"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: true,
  },
  overrides: [
    {
      files: ["**/*.test.ts", "**/*.spec.ts", "**/setupTests.ts"],
      env: { jest: true },
    },
  ],
};
