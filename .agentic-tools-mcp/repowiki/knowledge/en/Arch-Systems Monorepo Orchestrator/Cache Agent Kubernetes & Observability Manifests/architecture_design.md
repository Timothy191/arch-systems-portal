Two flat sub-directories under `infra/` hold immutable deployment and monitoring artifacts consumed by the cluster:

- `k8s/cache-agent.yaml` — a single `apps/v1` Deployment running three replicas of the `amca-cache-agent:latest` container on port 3008, with Redis L2 connectivity via the `REDIS_URLS` env var pointing at `redis-cluster:6379`, and fixed CPU/memory requests and limits.
- `observability/grafana-dashboards/cache-dashboard.json` — a Grafana dashboard (schemaVersion 30) that visualises `amca_cache_hits_total`, `amca_cache_misses_total`, and `amca_cache_latency_seconds_bucket` metrics as time-series and heatmap panels.
- `observability/prometheus-rules/cache-alerts.yaml` — a Prometheus rule group `AMCA.Rules` defining two alerts: `CacheMissRateTooHigh` (miss rate > 40% over 5m for ≥ 2m, severity warning) and `RedisShardDown` (any `up{job="redis-cluster"}` == 0 for ≥ 1m, severity critical).
  The module is purely declarative; there is no build step or code — manifests are applied directly to the cluster.
