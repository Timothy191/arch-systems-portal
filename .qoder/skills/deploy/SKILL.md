---
name: deploy
description: Deploy the portal to the target environment
disable-model-invocation: true
---

# Deploy Portal

Deploy the portal application to the specified environment.

## Usage

```
/deploy <environment>
```

Where `<environment>` is one of:
- `dev` — Development environment (Docker standalone mode)
- `local` — Local development (same as `pnpm dev`)

## Steps

### For `dev` environment:

1. Run the dev-mode deployment script:
   ```bash
   bash deploy-dev-mode.sh
   ```

2. This script:
   - Builds the portal with `output: "standalone"`
   - Creates a Docker image
   - Runs the container with environment variables from `.env`

### For `local` environment:

1. Start the local dev server:
   ```bash
   pnpm dev
   ```

## Pre-Deploy Checklist

Before deploying, ensure:
- [ ] `pnpm quality` passes (lint + type-check + test + format)
- [ ] No uncommitted changes (`git status` is clean)
- [ ] Environment variables are set in `.env` (not `.env.local`)
- [ ] Docker is running (`docker info` succeeds)

## Notes

- This skill is user-invoked only (`disable-model-invocation: true`).
- The AI should not auto-invoke deployment — always wait for explicit user command.
- For CI/CD deployments, refer to the deployment pipeline configuration.
- Secrets are injected as environment variables at runtime, never baked into the image.
