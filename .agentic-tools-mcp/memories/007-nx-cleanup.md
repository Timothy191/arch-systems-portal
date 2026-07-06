# Memory: Cleanup of Nx Leftovers and Obsolete Report Directory

## Context

The project was previously configured with Nx (now migrated to Turborepo) and contained old presentation/design compliance assets in the `report/` folder. Both were cleaned up to tidy the repository root. Additionally, the Repowise VS Code server was configured to use a stable, non-conflicting port, and the codebase LSP server requirements were mapped out permanently.

## Actions Taken

1. **Nx Leftovers**:
   - Deleted the `.nx/` cache directory from the repository root.
   - Deleted the root-level `nx.json` configuration file.
   - Removed `nx` dependency from `devDependencies` in the root `package.json`.
   - Ran `pnpm install` to update `pnpm-lock.yaml`.
2. **Report Assets**:
   - Deleted the `/home/timothy/Documents/Arch-Mk2/report` directory.
   - Removed the `report/` entries from `.eslintignore` and `.prettierignore`.
3. **Repowise Server Port Lock**:
   - Configured `repowise.server.port: 7337` and `repowise.server.autoStart: "always"` in `.vscode/settings.json`.
4. **Codebase LSP Map**:
   - Created the permanent document `docs/CODEBASE_LSP_MAP.md` mapping all directories, frameworks, languages, required LSPs/indexers, and MCP server configurations.
5. **Workspace sync**:
   - Re-indexed the workspace using `repowise` update command to prevent documentation and code intelligence drift.

## Status

Completed successfully.
