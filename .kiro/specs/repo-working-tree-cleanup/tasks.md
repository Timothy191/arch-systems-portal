# Tasks: Repo Working-Tree Cleanup

1. [x] Commit A: stage delete `apps/portal/app/`, add `_app_legacy_shadow/`.
2. [x] Commit C: remove `ai-backends/`.
3. [x] Commit E: `git mv features _features_legacy_shadow`; exclude in tsconfig; fix jest coverage paths.
4. [x] Commit B: finalize hub route move to `src/app/hub/`.
5. [x] Commit D: remaining portal product edits under `apps/portal/src` + related portal config.
6. [x] Commit F: packages/theme, eslint-config, root lockfile/package/turbo.
7. [x] Commit G: agent/docs/hooks (`.cursor`, `.kiro`, `.husky`, AGENTS/CLAUDE).
8. [x] Verify portal `:3000` /login; run scoped quality; sceptic + alignment score.
       Note: shadows gitignored (local-only). `pnpm quality` not re-run full; /login = 200. Remote still empty — push pending.
