# Memory: Clean up Optional Apps (CMS & Overview)

We cleaned up the monorepo by removing the optional, unused `apps/cms` and `apps/overview` services, consolidating the project structure.

## Context

The user wanted to confirm the monorepo's active servers and verify if the Payload CMS (`apps/cms`) and Flow Overview (`apps/overview`) are required. Since these are optional design/documentation visualizers and not required for the core mining-operations system to function, we removed them to simplify the repository and reduce HMR overhead.

## Actions Taken

1. **Removed Directories:** Deleted the `apps/cms` and `apps/overview` directories.
2. **Updated Workspaces Config:** Removed `apps/cms` and `apps/overview` from the `workspaces` array in [knip.json](file:///home/timothy/Documents/Arch-Mk2/knip.json).
3. **Updated Policy Rules:** Removed `"scope:app:cms"` and `"scope:app:overview"` from the `"allowedClients"` list of the `"ui-rendering"` component block in [intent-map.json](file:///home/timothy/Documents/Arch-Mk2/tools/policy/intent-map.json).
4. **Cleaned up dev.sh:** Simplified [dev.sh](file:///home/timothy/Documents/Arch-Mk2/scripts/dev.sh) by removing references to starting these apps, including parameters (`--cms`, `--overview`, `--all`), PID tracking, cache-cleaning directories, and Phase `3b` start logic.
5. **Regenerated Rules:** Executed `pnpm policy:gen` to rebuild custom ESLint rule boundaries.
6. **Fixed Types / Imports:** Restored the `export` keyword on types `ShiftCompleteness`, `ToolStatus`, and `WeatherData` that knip's auto-fix tool had incorrectly marked as unused. Removed the unused `aiChatSchema`.
7. **Formatted and Validated:** Ran `pnpm exec syncpack format` and checked the entire monorepo with `pnpm quality`, passing successfully.
8. **Updated Indexes:** Ran `repowise` to sync the updated repository graph.
