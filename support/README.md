# Support Engines Architecture

This directory houses high-performance extensions and support engines for the Arch-Mk2 monorepo.
By offloading CPU-intensive processing, data transformations, and caching logic to lower-level languages like Rust, we preserve the rapid iteration cycles of TypeScript and Python without sacrificing system latency.

## Structure

- `rust-support/`: A Cargo workspace containing all Rust logic, graphics, and cache engines.
- `tools-support/`: Helper scripts and deployment manifests for these engines.

## Integration Methods

- **Node.js (NestJS / Next.js)**: Utilizes `napi-rs` to load Rust modules directly into V8 memory for zero-latency invocations.
- **Python (ai-agents)**: Uses `PyO3` to bypass the GIL and evaluate complex logic graphs natively.
- **Browser (Next.js Portal)**: Targets WebAssembly (`wasm32-unknown-unknown`) using `wasm-bindgen` for offloading client-side visual workloads.
