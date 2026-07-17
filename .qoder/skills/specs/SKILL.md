---
name: specs
description: Create and manage spec-driven workflow specifications
---

# Spec-Driven Workflow Management

Create and manage specifications for the spec-driven workflow mandated by AGENTS.md.

## Create New Spec

**Usage:**
```
/specs create <feature-name>
```

**Steps:**
1. Create feature slug from name (lowercase, hyphenated):
   ```bash
   feature_slug=$(echo "<feature-name>" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | tr -cd 'a-z0-9-' | sed 's/--*/-/g')
   ```

2. Create spec directory:
   ```bash
   mkdir -p .kiro/specs/$feature_slug
   ```

3. Copy templates:
   ```bash
   cp .kiro/templates/requirements.md .kiro/specs/$feature_slug/
   cp .kiro/templates/design.md .kiro/specs/$feature_slug/
   cp .kiro/templates/tasks.md .kiro/specs/$feature_slug/
   ```

4. Update file headers with feature name:
   ```bash
   sed -i "s/{feature-name}/<feature-name>/g" .kiro/specs/$feature_slug/*.md
   sed -i "s/{feature-slug}/$feature_slug/g" .kiro/specs/$feature_slug/*.md
   ```

5. Provide instructions:
   ```
   Spec created at .kiro/specs/$feature_slug/
   
   Next steps:
   1. Fill .kiro/specs/$feature_slug/requirements.md
   2. Get user approval on requirements
   3. Fill .kiro/specs/$feature_slug/design.md  
   4. Get user approval on design
   5. Fill .kiro/specs/$feature_slug/tasks.md
   6. Execute tasks in order
   ```

## List Existing Specs

**Usage:**
```
/specs list
```

**Steps:**
```bash
ls -la .kiro/specs/
```

**Output:**
- List spec directories
- Show last modified dates
- Indicate completion status

## Check Spec Status

**Usage:**
```
/specs status <feature-slug>
```

**Steps:**
1. Check if spec exists
2. Check which phases are complete
3. Report on tasks completion status
4. Provide next steps

## Quality Check

**Usage:**
```
/specs quality <feature-slug>
```

**Steps:**
1. Run `pnpm quality` on current state
2. Report results
3. If failures, suggest fixes
4. Update tasks.md with completion status

## Notes

- Specs are REQUIRED for multi-file changes per AGENTS.md §1
- Use `.kiro/templates/` for consistent formatting
- Get user approval at each phase (requirements, design)
- Execute tasks in order, marking complete only after `pnpm quality` passes
- Reference existing spec: `.kiro/specs/portal-migration/`