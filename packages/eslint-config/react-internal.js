/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: ["eslint:recommended"],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  rules: {
    "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    "@typescript-eslint/no-explicit-any": "warn",
  },
  env: {
    browser: true,
    es2022: true,
    node: true,
  },
};
