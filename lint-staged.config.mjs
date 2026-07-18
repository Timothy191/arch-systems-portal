/**
 * lint-staged config — skip local-only legacy shadow archives.
 * @param {string[]} filenames
 */
function liveTsFiles(filenames) {
  return filenames.filter(
    (f) =>
      !f.includes("/_app_legacy_shadow/") &&
      !f.includes("/_features_legacy_shadow/") &&
      !f.includes("/src.backup/"),
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
