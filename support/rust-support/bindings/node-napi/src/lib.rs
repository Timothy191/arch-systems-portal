//! N-API bindings for Node.js — exposes cache-engine and logic-engine as async operations.
//!
//! Usage (Node.js):
//! ```js
//! const { CacheEngine, RuleEngine, TokenBucket } = require('./bindings.node');
//!
//! const cache = new CacheEngine(1000);
//! await cache.set('key', Buffer.from('value'));
//! const val = await cache.get('key');
//!
//! const bucket = new TokenBucket(100, 10);
//! const ok = await bucket.tryConsume(5);
//!
//! const engine = new RuleEngine();
//! const result = engine.evaluateRule(rule, context);
//! ```

use napi::bindgen_prelude::*;
use napi_derive::napi;

// Re-export cache-engine and logic-engine as N-API objects
use cache_engine::{CacheEngine as CoreCache, CacheError, TokenBucket as CoreBucket};
use logic_engine::{
    evaluate_rule, evaluate_rules, evaluate_rules_concurrent, evaluate_safety_interlocks,
    Action, AlertSeverity, Condition, LogLevel, Operator, Rule, RuleContext,
};

// ── Cache Engine Bindings ──────────────────────────────────

#[napi]
pub struct JsCacheEngine {
    inner: CoreCache,
}

#[napi]
impl JsCacheEngine {
    #[napi(constructor)]
    pub fn new(max_capacity: Option<i64>, ttl_secs: Option<i64>, tti_secs: Option<i64>) -> Self {
        let max_cap = max_capacity.unwrap_or(1000) as u64;
        let ttl = ttl_secs.unwrap_or(3600) as u64;
        let tti = tti_secs.unwrap_or(1800) as u64;

        Self {
            inner: CoreCache::with_config(max_cap, ttl, tti),
        }
    }

    #[napi]
    pub async fn get(&self, key: String) -> Result<Buffer> {
        match self.inner.get(&key).await {
            Ok(data) => Ok(data.into()),
            Err(CacheError::KeyNotFound(_)) => {
                Err(Error::from_reason(format!("Key not found: {}", key)))
            }
            Err(e) => Err(Error::from_reason(e.to_string())),
        }
    }

    #[napi]
    pub async fn set(&self, key: String, value: Buffer, ttl_ms: Option<i64>) -> Result<()> {
        let ttl = ttl_ms.map(|ms| std::time::Duration::from_millis(ms as u64));
        self.inner.insert(key, value.to_vec(), ttl).await;
        Ok(())
    }

    #[napi]
    pub async fn invalidate(&self, key: String) -> Result<()> {
        self.inner.invalidate(&key).await;
        Ok(())
    }

    #[napi]
    pub async fn invalidate_by_tag(&self, tag: String) -> Result<()> {
        self.inner.invalidate_by_tag(&tag).await;
        Ok(())
    }

    #[napi]
    pub fn stats(&self) -> String {
        self.inner.stats()
    }
}

// ── Token Bucket Bindings ──────────────────────────────────

#[napi]
pub struct JsTokenBucket {
    inner: std::sync::Arc<CoreBucket>,
}

#[napi]
impl JsTokenBucket {
    #[napi(constructor)]
    pub fn new(capacity: i64, refill_rate_per_sec: i64) -> Self {
        let bucket = std::sync::Arc::new(CoreBucket::new(
            capacity as u64,
            refill_rate_per_sec as u64,
        ));
        CoreBucket::spawn_refill_task(&bucket);
        Self { inner: bucket }
    }

    #[napi]
    pub async fn try_consume(&self, tokens: i64) -> bool {
        self.inner.try_consume(tokens as u32).await
    }

    #[napi]
    pub async fn consume(&self, tokens: i64) -> Result<()> {
        self.inner
            .consume(tokens as u32)
            .await
            .map_err(|e| Error::from_reason(e.to_string()))
    }

    #[napi]
    pub fn refund(&self, tokens: i64) {
        self.inner.refund(tokens as u32);
    }
}

// ── Rule Engine Bindings ───────────────────────────────────

#[napi(object)]
pub struct JsCondition {
    pub field: String,
    pub operator: String, // "GreaterThan", "LessThan", "Equal", etc.
    pub value: f64,
}

#[napi(object)]
pub struct JsAction {
    pub action_type: String,
    pub message: String,
    pub severity: String,
}

#[napi(object)]
pub struct JsRule {
    pub id: String,
    pub description: String,
    pub conditions: Vec<JsCondition>,
    pub action: JsAction,
    pub enabled: bool,
    pub priority: i64,
}

#[napi(object)]
pub struct JsRuleContext {
    pub values: std::collections::HashMap<String, f64>,
    pub metadata: std::collections::HashMap<String, String>,
}

#[napi(object)]
pub struct JsRuleResult {
    pub matched: bool,
    pub rule_id: String,
    pub actions: Vec<JsAction>,
    pub timestamp: i64,
}

fn js_operator_to_rust(op: &str) -> Operator {
    match op {
        "GreaterThan" => Operator::GreaterThan,
        "LessThan" => Operator::LessThan,
        "GreaterThanOrEqual" => Operator::GreaterThanOrEqual,
        "LessThanOrEqual" => Operator::LessThanOrEqual,
        "Equal" => Operator::Equal,
        "NotEqual" => Operator::NotEqual,
        _ => Operator::Equal,
    }
}

fn js_severity_to_rust(sev: &str) -> AlertSeverity {
    match sev {
        "Info" => AlertSeverity::Info,
        "Warning" => AlertSeverity::Warning,
        "Critical" => AlertSeverity::Critical,
        "Emergency" => AlertSeverity::Emergency,
        _ => AlertSeverity::Info,
    }
}

fn js_action_to_rust(action: &JsAction) -> Action {
    match action.action_type.as_str() {
        "Shutdown" => Action::Shutdown {
            reason: action.message.clone(),
        },
        "Alert" => Action::Alert {
            message: action.message.clone(),
            severity: js_severity_to_rust(&action.severity),
        },
        "LogEvent" => Action::LogEvent {
            message: action.message.clone(),
            level: LogLevel::Info,
        },
        _ => Action::LogEvent {
            message: action.message.clone(),
            level: LogLevel::Info,
        },
    }
}

#[napi]
pub fn evaluate_single_rule(rule: JsRule, context: JsRuleContext) -> JsRuleResult {
    let rust_rule = Rule {
        id: rule.id.clone(),
        description: rule.description.clone(),
        conditions: rule
            .conditions
            .iter()
            .map(|c| Condition {
                field: c.field.clone(),
                operator: js_operator_to_rust(&c.operator),
                value: c.value,
            })
            .collect(),
        action: js_action_to_rust(&rule.action),
        enabled: rule.enabled,
        priority: rule.priority as u32,
    };

    let rust_ctx = RuleContext {
        values: context.values,
        timestamp: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs(),
        metadata: context.metadata,
    };

    let result = evaluate_rule(&rust_rule, &rust_ctx);

    JsRuleResult {
        matched: result.matched,
        rule_id: result.rule.id,
        actions: result
            .actions
            .iter()
            .map(|a| map_action_to_js(a))
            .collect(),
        timestamp: result.timestamp as i64,
    }
}

#[napi]
pub fn evaluate_rules_sync(rules: Vec<JsRule>, context: JsRuleContext) -> Vec<JsRuleResult> {
    let rust_rules: Vec<Rule> = rules
        .iter()
        .map(|r| Rule {
            id: r.id.clone(),
            description: r.description.clone(),
            conditions: r
                .conditions
                .iter()
                .map(|c| Condition {
                    field: c.field.clone(),
                    operator: js_operator_to_rust(&c.operator),
                    value: c.value,
                })
                .collect(),
            action: js_action_to_rust(&r.action),
            enabled: r.enabled,
            priority: r.priority as u32,
        })
        .collect();

    let rust_ctx = RuleContext {
        values: context.values,
        timestamp: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs(),
        metadata: context.metadata,
    };

    let results = evaluate_rules(&rust_rules, &rust_ctx);

    results
        .into_iter()
        .map(|result| JsRuleResult {
            matched: result.matched,
            rule_id: result.rule.id,
            actions: result
                .actions
                .iter()
                .map(|a| map_action_to_js(a))
                .collect(),
            timestamp: result.timestamp as i64,
        })
        .collect()
}

fn map_action_to_js(action: &Action) -> JsAction {
    match action {
        Action::Alert { message, severity } => JsAction {
            action_type: "Alert".to_string(),
            message: message.clone(),
            severity: format!("{:?}", severity),
        },
        Action::TriggerAction {
            action_type,
            parameters: _,
        } => JsAction {
            action_type: action_type.clone(),
            message: String::new(),
            severity: "Info".to_string(),
        },
        Action::LogEvent { message, level: _ } => JsAction {
            action_type: "LogEvent".to_string(),
            message: message.clone(),
            severity: "Info".to_string(),
        },
        Action::Shutdown { reason } => JsAction {
            action_type: "Shutdown".to_string(),
            message: reason.clone(),
            severity: "Critical".to_string(),
        },
    }
}
