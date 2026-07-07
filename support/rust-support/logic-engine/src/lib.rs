use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use thiserror::Error;
use tracing::{debug, info, instrument, warn};
use tokio::task::JoinSet;

// Conditionally compile zen-engine integration
#[cfg(feature = "zen")]
pub mod zen;

#[cfg(feature = "zen")]
pub use zen::*;

// ── Error Types ────────────────────────────────────────────

#[derive(Error, Debug)]
pub enum RuleEngineError {
    #[error("Rule evaluation failed: {0}")]
    EvaluationFailed(String),

    #[error("Rule not found: {0}")]
    RuleNotFound(String),

    #[error("Invalid context: missing field '{0}'")]
    MissingField(String),

    #[error("Concurrent evaluation error: {0}")]
    ConcurrentError(String),
}

pub type RuleResult<T> = Result<T, RuleEngineError>;

// ── Domain Types ───────────────────────────────────────────

/// Represents a single condition in a rule
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Condition {
    pub field: String,
    pub operator: Operator,
    pub value: f64,
}

/// Comparison operators for rule conditions
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum Operator {
    GreaterThan,
    LessThan,
    GreaterThanOrEqual,
    LessThanOrEqual,
    Equal,
    NotEqual,
}

/// Represents an action to be taken when a rule evaluates to true
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Action {
    Alert { message: String, severity: AlertSeverity },
    TriggerAction { action_type: String, parameters: HashMap<String, String> },
    LogEvent { message: String, level: LogLevel },
    Shutdown { reason: String },
}

/// Severity levels for alerts
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum AlertSeverity {
    Info,
    Warning,
    Critical,
    Emergency,
}

/// Log levels
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum LogLevel {
    Debug,
    Info,
    Warning,
    Error,
}

/// A complete rule consisting of conditions and an action
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Rule {
    pub id: String,
    pub description: String,
    pub conditions: Vec<Condition>,
    pub action: Action,
    pub enabled: bool,
    pub priority: u32,
}

/// Context object containing the current state
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RuleContext {
    pub values: HashMap<String, f64>,
    pub timestamp: u64,
    pub metadata: HashMap<String, String>,
}

impl RuleContext {
    pub fn new() -> Self {
        Self {
            values: HashMap::new(),
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs(),
            metadata: HashMap::new(),
        }
    }

    pub fn set_value(&mut self, key: String, value: f64) {
        self.values.insert(key, value);
    }

    pub fn get_value(&self, key: &str) -> Option<&f64> {
        self.values.get(key)
    }
}

/// Result of rule evaluation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RuleEvaluationResult {
    pub matched: bool,
    pub rule: Rule,
    pub actions: Vec<Action>,
    pub timestamp: u64,
}

// ── Synchronous Evaluation (backward compatible) ───────────

/// Evaluates a single rule against the current context
#[instrument(skip(rule, context))]
pub fn evaluate_rule(rule: &Rule, context: &RuleContext) -> RuleEvaluationResult {
    if !rule.enabled {
        debug!(rule_id = %rule.id, "Rule is disabled, skipping");
        return RuleEvaluationResult {
            matched: false,
            rule: rule.clone(),
            actions: Vec::new(),
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs(),
        };
    }

    let mut all_conditions_met = true;

    for condition in &rule.conditions {
        if let Some(value) = context.get_value(&condition.field) {
            let condition_met = match condition.operator {
                Operator::GreaterThan => *value > condition.value,
                Operator::LessThan => *value < condition.value,
                Operator::GreaterThanOrEqual => *value >= condition.value,
                Operator::LessThanOrEqual => *value <= condition.value,
                Operator::Equal => (*value - condition.value).abs() < f64::EPSILON,
                Operator::NotEqual => (*value - condition.value).abs() >= f64::EPSILON,
            };

            if !condition_met {
                all_conditions_met = false;
                break;
            }
        } else {
            debug!(
                rule_id = %rule.id,
                field = %condition.field,
                "Field not found in context"
            );
            all_conditions_met = false;
            break;
        }
    }

    let mut actions = Vec::new();
    if all_conditions_met {
        debug!(rule_id = %rule.id, "Rule matched");
        actions.push(rule.action.clone());
    }

    RuleEvaluationResult {
        matched: all_conditions_met,
        rule: rule.clone(),
        actions,
        timestamp: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs(),
    }
}

/// Evaluates rules sequentially in priority order
#[instrument(skip(rules, context))]
pub fn evaluate_rules(rules: &[Rule], context: &RuleContext) -> Vec<RuleEvaluationResult> {
    info!(rule_count = rules.len(), "Evaluating rules sequentially");

    let mut sorted_rules: Vec<&Rule> = rules.iter().collect();
    sorted_rules.sort_by(|a, b| a.priority.cmp(&b.priority));

    let mut results = Vec::with_capacity(sorted_rules.len());
    for rule in &sorted_rules {
        let result = evaluate_rule(rule, context);
        results.push(result);
    }

    results
}

// ── Concurrent Evaluation ──────────────────────────────────

/// Evaluates rules concurrently using tokio::task::JoinSet
/// Note: For CPU-bound rules (float comparisons), JoinSet adds tokio task overhead.
/// For large rule sets (>100), consider rayon or std::thread::scope instead.
#[instrument(skip(rules, context))]
pub async fn evaluate_rules_concurrent(
    rules: &[Rule],
    context: &RuleContext,
    max_concurrency: usize,
) -> Vec<RuleEvaluationResult> {
    info!(
        rule_count = rules.len(),
        max_concurrency = max_concurrency,
        "Evaluating rules concurrently"
    );

    let mut sorted_rules: Vec<Rule> = rules.to_vec();
    sorted_rules.sort_by(|a, b| a.priority.cmp(&b.priority));

    let mut set: JoinSet<RuleEvaluationResult> = JoinSet::new();
    let ctx = context.clone();

    let mut results: Vec<(u32, RuleEvaluationResult)> = Vec::new();

    for rule in sorted_rules.into_iter() {
        // Enforce concurrency limit — if at max, wait for one to complete first
        if set.len() >= max_concurrency {
            if let Some(completed) = set.join_next().await {
                match completed {
                    Ok(res) => {
                        let p = res.rule.priority;
                        results.push((p, res));
                    }
                    Err(e) => warn!(error = %e, "Rule task failed"),
                }
            }
        }

        let rule_ctx = ctx.clone();
        set.spawn(async move {
            evaluate_rule(&rule, &rule_ctx)
        });
    }

    // Collect remaining results
    while let Some(result) = set.join_next().await {
        match result {
            Ok(res) => {
                let priority = res.rule.priority;
                results.push((priority, res));
            }
            Err(e) => {
                warn!(error = %e, "Rule evaluation task failed");
            }
        }
    }

    results.sort_by(|a, b| a.0.cmp(&b.0));
    results.into_iter().map(|(_, r)| r).collect()
}

// ── Safety Interlocks ──────────────────────────────────────

/// Evaluates safety interlock rules sequentially
#[instrument(skip(rules, context))]
pub fn evaluate_safety_interlocks(
    rules: &[Rule],
    context: &RuleContext,
) -> Vec<RuleEvaluationResult> {
    info!(rule_count = rules.len(), "Evaluating safety interlocks");

    let safety_rules: Vec<Rule> = rules
        .iter()
        .filter(|rule| {
            matches!(
                &rule.action,
                Action::Alert {
                    severity: AlertSeverity::Critical | AlertSeverity::Emergency,
                    ..
                } | Action::Shutdown { .. }
            )
        })
        .cloned()
        .collect();

    evaluate_rules(&safety_rules, context)
}

/// Concurrent version of safety interlock evaluation
#[instrument(skip(rules, context))]
pub async fn evaluate_safety_interlocks_concurrent(
    rules: &[Rule],
    context: &RuleContext,
    max_concurrency: usize,
) -> Vec<RuleEvaluationResult> {
    let safety_rules: Vec<Rule> = rules
        .iter()
        .filter(|rule| {
            matches!(
                &rule.action,
                Action::Alert {
                    severity: AlertSeverity::Critical | AlertSeverity::Emergency,
                    ..
                } | Action::Shutdown { .. }
            )
        })
        .cloned()
        .collect();

    info!(
        safety_rule_count = safety_rules.len(),
        "Evaluating safety interlocks concurrently"
    );

    evaluate_rules_concurrent(&safety_rules, context, max_concurrency).await
}

// ── Factory Helpers ────────────────────────────────────────

pub fn create_high_temperature_shutdown_rule(threshold: f64) -> Rule {
    Rule {
        id: "high_temp_shutdown".to_string(),
        description: "Shut down system if temperature exceeds safe threshold".to_string(),
        conditions: vec![Condition {
            field: "temperature".to_string(),
            operator: Operator::GreaterThan,
            value: threshold,
        }],
        action: Action::Shutdown {
            reason: format!("Temperature exceeded {:.1}°C safety threshold", threshold),
        },
        enabled: true,
        priority: 1,
    }
}

pub fn create_pressure_warning_rule(threshold: f64) -> Rule {
    Rule {
        id: "pressure_warning".to_string(),
        description: "Warn when pressure approaches dangerous levels".to_string(),
        conditions: vec![Condition {
            field: "pressure".to_string(),
            operator: Operator::GreaterThan,
            value: threshold * 0.8,
        }],
        action: Action::Alert {
            message: format!("Pressure approaching critical threshold ({} kPa)", threshold),
            severity: AlertSeverity::Warning,
        },
        enabled: true,
        priority: 5,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_rule_evaluation() {
        let rule = Rule {
            id: "test_rule".to_string(),
            description: "Test rule".to_string(),
            conditions: vec![Condition {
                field: "temperature".to_string(),
                operator: Operator::GreaterThan,
                value: 100.0,
            }],
            action: Action::Alert {
                message: "Temperature too high!".to_string(),
                severity: AlertSeverity::Warning,
            },
            enabled: true,
            priority: 1,
        };

        let mut context = RuleContext::new();
        context.set_value("temperature".to_string(), 50.0);

        let result = evaluate_rule(&rule, &context);
        assert!(!result.matched);
        assert!(result.actions.is_empty());

        let mut context2 = RuleContext::new();
        context2.set_value("temperature".to_string(), 150.0);

        let result2 = evaluate_rule(&rule, &context2);
        assert!(result2.matched);
        assert_eq!(result2.actions.len(), 1);
    }

    #[test]
    fn test_safety_interlocks() {
        let rules = vec![
            create_high_temperature_shutdown_rule(80.0),
            create_pressure_warning_rule(100.0),
        ];

        let mut context = RuleContext::new();
        context.set_value("temperature".to_string(), 85.0);
        context.set_value("pressure".to_string(), 50.0);

        let results = evaluate_safety_interlocks(&rules, &context);
        assert_eq!(results.len(), 1);
        assert!(results[0].matched);

        if let Action::Shutdown { reason } = &results[0].actions[0] {
            assert!(reason.contains("80.0°C"));
        } else {
            panic!("Expected shutdown action");
        }
    }

    #[tokio::test]
    async fn test_concurrent_evaluation() {
        let rules = vec![
            create_high_temperature_shutdown_rule(80.0),
            create_pressure_warning_rule(100.0),
        ];

        let mut context = RuleContext::new();
        context.set_value("temperature".to_string(), 85.0);
        context.set_value("pressure".to_string(), 50.0);

        let results = evaluate_rules_concurrent(&rules, &context, 4).await;
        assert_eq!(results.len(), 2);
        assert!(results[0].matched);
        assert!(!results[1].matched);
    }

    #[tokio::test]
    async fn test_concurrent_no_match() {
        let rules = vec![
            create_high_temperature_shutdown_rule(80.0),
            create_pressure_warning_rule(100.0),
        ];

        let mut context = RuleContext::new();
        context.set_value("temperature".to_string(), 50.0);
        context.set_value("pressure".to_string(), 30.0);

        let results = evaluate_rules_concurrent(&rules, &context, 4).await;
        assert_eq!(results.len(), 2);
        assert!(!results[0].matched);
        assert!(!results[1].matched);
    }

    #[tokio::test]
    async fn test_concurrent_limits() {
        let mut rules = Vec::new();
        for i in 0..20 {
            rules.push(Rule {
                id: format!("rule_{}", i),
                description: format!("Rule {}", i),
                conditions: vec![Condition {
                    field: "value".to_string(),
                    operator: Operator::GreaterThan,
                    value: 10.0,
                }],
                action: Action::LogEvent {
                    message: format!("Rule {} triggered", i),
                    level: LogLevel::Info,
                },
                enabled: true,
                priority: i + 1,
            });
        }

        let mut context = RuleContext::new();
        context.set_value("value".to_string(), 20.0);

        let results = evaluate_rules_concurrent(&rules, &context, 5).await;
        assert_eq!(results.len(), 20);
        assert!(results.iter().all(|r| r.matched));
    }

    #[tokio::test]
    async fn test_concurrent_safety_interlocks() {
        let rules = vec![
            create_high_temperature_shutdown_rule(80.0),
            create_pressure_warning_rule(100.0),
        ];

        let mut context = RuleContext::new();
        context.set_value("temperature".to_string(), 85.0);
        context.set_value("pressure".to_string(), 50.0);

        let results =
            evaluate_safety_interlocks_concurrent(&rules, &context, 4).await;
        assert_eq!(results.len(), 1);
        assert!(results[0].matched);

        if let Action::Shutdown { reason } = &results[0].actions[0] {
            assert!(reason.contains("80.0°C"));
        } else {
            panic!("Expected shutdown action");
        }
    }
}
