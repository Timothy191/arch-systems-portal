/**
 * lint-staged config — skip local-only legacy shadow archives.
 * @param {string[]} filenames
 */
function liveTsFiles(filenames) {
  return filenames.filter(
    (f) =>
      !f.includes("/src.backup/") &&
      !f.includes("/packages/rust-bindings/"),
  );
}

export default {
  "*.{ts,tsx}": (filenames) => {
    const files = liveTsFiles(filenames);
    if (files.length === 0) return [];
    const quoted = files.map((f) => `"${f}"`).join(" ");
    return [`eslint --fix ${quoted}`, `prettier --write ${quoted}`];
  },
  "*.{json,md}": "prettier --write",
};
