# Memory 026: Workspace Directories Cleanup

## Context
The user requested a review of several directories in `/home/timothy/Documents/Arch-Mk2/` (`wiki`, `tools`, `test-results`, `tooling`, `redis-topology`, `scratch`, `specs`, `monitoring`, `home`, `e2e`, and `ci`) to identify active requirements and any cleanup opportunities.

An analysis was compiled into `cleanup_analysis.md`, which identified several redundant folders and mislocated files. The user approved the cleanup options.

## Actions Taken

1. **Accidental `home/` Directory Deleted**: 
   - Path: `home/timothy/Documents/Arch-Mk2/.agents/` (empty)
   - Rationale: Created accidentally by a script or command using a relative path that mimicked the user's home folder. 
   - Action: Completely deleted using `rm -rf home/`.

2. **Obsolete `tooling/` Directory Deleted**:
   - Path: `tooling/turbo.json`
   - Rationale: Contained a legacy Turborepo v1 `turbo.json` using the obsolete `pipeline` schema. The active, production-ready configuration is located at root-level `turbo.json` (using Turborepo v2 `tasks` schema).
   - Action: Completely deleted using `rm -rf tooling/`.

3. **Nested Duplicate `wiki/wiki/` Deleted**:
   - Path: `wiki/wiki/`
   - Rationale: An accidental nested folder containing duplicate overview files and outdated questions. The active documentation resides in the root `wiki/` directory.
   - Action: Completely deleted using `rm -rf wiki/wiki/`.

4. **CI Workflows Relocated**:
   - Path: Moved from `ci/workflows/` to `.github/workflows/`
   - Rationale: GitHub Actions workflows (e.g. `api-build-test.yml`, `policy-evaluation.yml`, `pr-cache-warmup.yml`) must be located inside `.github/workflows/` to be detected and run by GitHub. Being placed in `ci/` left them inactive.
   - Action: Created `.github/workflows/`, moved all workflows there, and deleted the empty `ci/workflows/` directory.

## Outcomes & Verification
- `git status` verifies the deletion of redundant directories and the staging/relocation of the workflows to the correct directory (`.github/workflows/`).
- Verified that active directories (`e2e/`, `monitoring/`, `tools/`, and the main `wiki/` content) remain intact.
- The standard workspace layout is now cleaner and fully aligned with standard GitHub Actions and Turborepo configurations.
