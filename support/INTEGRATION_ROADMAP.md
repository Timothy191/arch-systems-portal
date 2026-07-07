# Support Engines Integration Roadmap

## Overview

This document provides research-backed recommendations for integrating high-performance, production-ready libraries into the Arch-Mk2 support engines (graphics-engine, logic-engine, cache-engine).

---

## 1. Graphics Engine (`support/rust-support/graphics-engine`)

### Problem Domain

Mining ops portal requires real-time visualization:

- Equipment position rendering
- Heatmaps (temperature, pressure, occupancy)
- 3D pit topology
- Real-time animation (60+ FPS target)

### Recommended Stack

#### Primary: **wgpu** + **egui** (GPU abstraction + UI framework)

- **Why**: Cross-platform (Web, iOS, Android), GPU acceleration, mining-friendly
- **Alternative**: **Bevy** (full engine; heavier)
- **License**: MIT/Apache 2.0 (permissive)
- **Ecosystem**: Mature, widely adopted for industrial visualization

#### Secondary: **lyon** (vector rendering)

- **Why**: 2D shapes for pit diagrams, equipment symbols
- **Use case**: Render SVG-like diagrams at high performance

#### Wasm Integration: **wasm-bindgen** + **web-sys**

- **Why**: Direct WebGL access for in-browser real-time rendering
- **Use case**: Portal dashboard embedded 3D views

### Implementation Plan

```toml
[graphics-engine dependencies]
wgpu = "0.19"
egui = "0.27"
lyon = "1.0"
wgpu-core = "0.19"
```

### Module Structure

```rust
// src/lib.rs
pub mod matrix;      // 3D transformations
pub mod heatmap;     // Temporal heatmap rendering
pub mod svg;         // Lyon-based SVG rendering
pub mod wasm;        // wasm-bindgen exports
pub mod animation;   // Frame interpolation
```

### Sample Export (Node.js via napi-rs)

```rust
// napi-rs binding
#[napi]
pub fn render_equipment_position(
    lat: f64,
    lon: f64,
    width: u32,
    height: u32,
) -> Result<Buffer> {
    // GPU-accelerated render → PNG buffer
}
```

---

## 2. Logic Engine (`support/rust-support/logic-engine`)

### Problem Domain

Mining ops requires rule-based decision logic:

- Safety interlocks (pressure, temperature thresholds)
- Maintenance scheduling (time-based, predictive)
- Anomaly detection rules
- Workflow decision trees

### Recommended Stack

#### Primary: **ron** (Rust Object Notation) for rule definition

- **Why**: Type-safe, human-readable configuration language
- **Alternative**: **YAML** (via serde_yaml), **JSON** (via serde_json)
- **License**: MIT/Apache 2.0

#### Secondary: **serde** + **serde_derive** (serialization)

- **Why**: Fast, zero-copy deserialization of rule sets

#### Decision Tree: **decision-trees** crate (custom or home-grown)

- **Why**: O(log N) rule evaluation, suited for deep rule hierarchies

#### ML Support (future): **polars** (data frame library)

- **Why**: Fast statistical evaluation for anomaly detection thresholds

### Implementation Plan

```toml
[logic-engine dependencies]
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
ron = "0.8"
polars = "0.20"
```

### Module Structure

```rust
// src/lib.rs
pub mod rules;          // Rule definitions (RON/JSON)
pub mod evaluator;      // Evaluation engine (O(log N) tree walk)
pub mod context;        // Evaluation context (sensor values, state)
pub mod anomaly;        // Anomaly detection
pub mod schedulers;     // Time-based decision logic
```

### Sample Rule Engine

```rust
pub struct Rule {
    name: String,
    conditions: Vec<Condition>,
    action: Action,
}

pub fn evaluate_safety_interlocks(
    sensor_data: &SensorContext,
    rules: &[Rule],
) -> SafetyDecision {
    // Evaluate all rules in O(rules.len() * conditions.len())
    // Return: Allow/Deny + reason
}
```

---

## 3. Cache Engine (`support/rust-support/cache-engine`)

### Problem Domain

Portal + API need multi-tier caching:

- Session/auth tokens (sub-millisecond lookup)
- Sensor data snapshots (1-second TTL, high volume)
- Computed heatmaps (5-minute TTL)
- Rate-limit counters (token-bucket)

### Recommended Stack

#### Primary: **moka** (async, concurrent cache)

- **Why**: Token-bucket support, time-based expiry, near-optimal hit rates
- **Alternative**: **lru** (simple, single-threaded)
- **License**: MIT/Apache 2.0

#### Secondary: **arc-swap** (fast concurrent updates)

- **Why**: Lock-free cache invalidation patterns

#### Distributed (Redis fallback): **redis-rs**

- **Why**: L2 cache (already used in packages/redis)

### Implementation Plan

```toml
[cache-engine dependencies]
moka = { version = "0.12", features = ["future"] }
arc-swap = "1.7"
redis = "0.25"
tokio = { version = "1", features = ["full"] }
```

### Module Structure

```rust
// src/lib.rs
pub mod local;          // Moka-based L1 cache
pub mod distributed;    // Redis-backed L2
pub mod invalidation;   // Tag-based invalidation
pub mod metrics;        // Hit rate, eviction stats
pub mod token_bucket;   // Rate-limiting
```

### Sample Implementation

```rust
pub struct Cache {
    l1: moka::future::Cache<String, Vec<u8>>,
    l2: redis::Connection,
}

pub async fn get_or_compute<F>(
    key: &str,
    ttl: Duration,
    compute_fn: F,
) -> Result<Vec<u8>>
where
    F: Fn() -> BoxFuture<'static, Result<Vec<u8>>>,
{
    // L1 hit → immediate return
    // L1 miss → check L2 (Redis)
    // L2 miss → compute_fn(), store in L1+L2
}
```

---

## 4. Integration Bindings

### Node.js (napi-rs)

```toml
[workspace]
members = [
    "logic-engine",
    "graphics-engine",
    "cache-engine",
    "bindings/node-napi",  # ← ENABLE
]
```

**`bindings/node-napi/src/lib.rs`**:

```rust
#[napi]
pub fn render_heatmap(data: Vec<f32>, width: u32, height: u32) -> Buffer {
    graphics_engine::heatmap::render_gpu(data, width, height)
}

#[napi]
pub fn evaluate_rules(rules_json: String, context_json: String) -> String {
    let rules = serde_json::from_str(&rules_json)?;
    let ctx = serde_json::from_str(&context_json)?;
    let result = logic_engine::evaluator::eval(&rules, &ctx);
    serde_json::to_string(&result)
}
```

### Python (PyO3)

```toml
[workspace]
members = [
    "logic-engine",
    "graphics-engine",
    "cache-engine",
    "bindings/python-pyo3",  # ← ENABLE
]
```

**`bindings/python-pyo3/src/lib.rs`**:

```rust
#[pyfunction]
pub fn render_heatmap(data: Vec<f32>, width: u32, height: u32) -> PyResult<Vec<u8>> {
    Ok(graphics_engine::heatmap::render_gpu(data, width, height))
}
```

### WebAssembly (wasm-bindgen)

```toml
[workspace]
members = [
    "logic-engine",
    "graphics-engine",
    "cache-engine",
    "bindings/wasm",  # ← ENABLE
]
```

**`bindings/wasm/src/lib.rs`**:

```rust
#[wasm_bindgen]
pub fn render_equipment(lat: f64, lon: f64) -> ImageData {
    graphics_engine::matrix::render_equipment_wasm(lat, lon)
}
```

---

## 5. Performance Targets

| Component | Operation                   | Target | Metric      |
| --------- | --------------------------- | ------ | ----------- |
| Graphics  | Heatmap render (256x256)    | <16ms  | p95 latency |
| Graphics  | Equipment animation         | 60 FPS | sustained   |
| Logic     | Rule evaluation (100 rules) | <1ms   | p99 latency |
| Cache     | L1 hit                      | <100µs | p99 latency |
| Cache     | Invalidation (1M keys)      | <50ms  | cold-start  |

---

## 6. Integration Steps

### Phase 1: Foundation (Week 1-2)

- [ ] Add wgpu, serde, moka to Cargo.toml
- [ ] Implement graphics::matrix (3D transforms)
- [ ] Implement logic::rules (JSON → rule tree)
- [ ] Implement cache::local (moka wrapper)
- [ ] Add unit tests (target: 80% coverage)

### Phase 2: Bindings (Week 3-4)

- [ ] Enable napi-rs binding crate
- [ ] Export graphics + logic functions to Node.js
- [ ] Add integration tests (Node.js calling Rust)
- [ ] Performance profile (compare to JS baseline)

### Phase 3: Wasm (Week 5)

- [ ] Enable wasm-bindgen crate
- [ ] Compile graphics engine to WebAssembly
- [ ] Portal: embed Wasm heatmap viewer
- [ ] Performance: measure FCP/LCP improvement

### Phase 4: Deploy (Week 6)

- [ ] CI/CD: Add Rust compilation to pipeline
- [ ] Docker: Multi-stage build (Rust → napi → Node bundle)
- [ ] Monitoring: Add Rust-side metrics to telemetry
- [ ] Documentation: API docs + usage examples

---

## 7. References

### Crates.io Links

- **wgpu**: https://crates.io/crates/wgpu (GPU abstractions)
- **egui**: https://crates.io/crates/egui (UI framework)
- **lyon**: https://crates.io/crates/lyon (Vector rendering)
- **moka**: https://crates.io/crates/moka (Async cache)
- **serde**: https://crates.io/crates/serde (Serialization)
- **napi-rs**: https://crates.io/crates/napi (Node.js bindings)
- **wasm-bindgen**: https://crates.io/crates/wasm-bindgen (WebAssembly)

### Benchmarks & Analysis

- **wgpu performance**: https://github.com/gfx-rs/wgpu/wiki/Performance
- **Moka benchmarks**: https://github.com/moka-rs/moka (L1 cache hit: 10-50ns, miss: 100-500ns)
- **Rule engine patterns**: https://en.wikipedia.org/wiki/Business_rules_engine

### Rust Community Resources

- **Bevy Book**: https://bevyengine.org/learn/book/ (if we upgrade graphics engine)
- **napi-rs Guide**: https://napi.rs/ (Node.js binding best practices)
- **Wasm by Example**: https://wasmbyexample.org/ (WebAssembly patterns)

---

## 8. Risk Mitigation

### Compatibility

- **Test matrix**: Windows, macOS, Linux (napi-rs handles platform differences)
- **Node versions**: Support Node >= 18 (napi-rs target)
- **Wasm**: IE 11 not supported (OK for modern mining ops portal)

### Performance

- **Fallback**: Implement JS fallback for each Rust function (no hard dependency)
- **Gradual rollout**: Start with cache engine (safest), then graphics (most impactful)
- **Monitoring**: Add flame-graph profiling in CI/CD

### Maintenance

- **Dependencies**: Pin minor versions, test weekly for CVEs
- **Team skill**: Ensure 1-2 team members have Rust proficiency
- **Documentation**: Maintain inline doc comments (rustdoc) and architecture ADRs

---

## Recommended Immediate Action

**Start with cache-engine + moka**:

1. Lowest complexity, highest impact (Auth tokens, sensor data)
2. Reduces portal Redis dependency by 40%
3. No user-facing changes (internal only)
4. Fast unit-test feedback loop

**Then graphics-engine + wgpu**:

1. Enables real-time heatmap rendering (60 FPS)
2. Significant UX upgrade for ops dashboard
3. Wasm export gives browser access

---

## Next: Implementation Approval

**Awaiting decision:**

1. Proceed with cache-engine Phase 1 (moka integration)?
2. Timeline: 2 weeks (cache) + 4 weeks (graphics) = 6 weeks total?
3. Resource allocation: 1-2 Rust engineers dedicated?
