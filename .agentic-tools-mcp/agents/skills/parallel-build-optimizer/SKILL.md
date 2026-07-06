---
name: parallel-build-optimizer
description: 'Optimizes build times by analyzing parallel execution patterns, computing FFT on timing data, and recommending optimal concurrency settings for the MPC build system.'
depends-on: []
metadata:
  version: "1.0"
  type: "build-optimization"
  capabilities:
    - Parallel build execution analysis
    - FFT-based timing pattern detection
    - Concurrency recommendation engine
    - Build artifact checksum verification
---

# Parallel Build Optimizer

Analyzes build pipeline timings using FFT (Fast Fourier Transform) to detect patterns and recommend optimal parallel execution strategies.

## Workflow

1. **Collect timing data**: Run `pnpm build --analyze` or use the preflight-mcp `mpc_full_quality_gate` tool
2. **Run FFT analysis**: Invoke `mpc_fft_analyze` with collected duration data
3. **Apply recommendations**: Adjust concurrency based on spectral centroid and dominant frequency
4. **Verify integrity**: Run `mpc_checksum_verify` to confirm build artifacts match expectations

## Example

```bash
# Run full quality gate with FFT analysis
node tools/preflight-mcp/index.js --tool mpc_full_quality_gate --concurrency 6

# Or invoke via MCP
# {
#   "tool": "mpc_full_quality_gate",
#   "args": { "concurrency": 8 }
# }
```

## Interpretation Guide

| Spectral Centroid | Meaning | Recommendation |
|---|---|---|
| < 0.25 | Stable, sequential-like pattern | Increase concurrency |
| 0.25 - 0.5 | Moderate variation | Current concurrency acceptable |
| > 0.5 | High-frequency fluctuation | Reduce concurrency, check for contention |
