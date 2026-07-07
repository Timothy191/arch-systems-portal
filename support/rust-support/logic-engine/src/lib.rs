use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Represents a single condition in a rule
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Condition {
    /// The variable/field to evaluate (e.g., "temperature", "pressure")
    pub field: String,
    /// The comparison operator (>, <, >=, <=, ==, !=)
    pub operator: Operator,
    /// The value to compare against
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
    /// Send an alert/notification
    Alert { message: String, severity: AlertSeverity },
    /// Trigger an automated response
    TriggerAction { action_type: String, parameters: HashMap<String, String> },
    /// Log an event
    LogEvent { message: String, level: LogLevel },
    /// Initiate a safety shutdown
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
    /// Unique identifier for the rule
    pub id: String,
    /// Human-readable description of what the rule does
    pub description: String,
    /// All conditions that must be true for the rule to trigger
    pub conditions: Vec<Condition>,
    /// The action to take when all conditions are met
    pub action: Action,
    /// Whether the rule is currently active
    pub enabled: bool,
    /// Priority level (lower numbers = higher priority)
    pub priority: u32,
}

/// Context object containing the current state of the system for rule evaluation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RuleContext {
    /// Current sensor readings and system state
    pub values: HashMap<String, f64>,
    /// Timestamp of when this context was captured
    pub timestamp: u64,
    /// Additional metadata
    pub metadata: HashMap<String, String>,
}

impl RuleContext {
    /// Create a new empty context
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

    /// Set a value in the context
    pub fn set_value(&mut self, key: String, value: f64) {
        self.values.insert(key, value);
    }

    /// Get a value from the context
    pub fn get_value(&self, key: &str) -> Option<&f64> {
        self.values.get(key)
    }
}

/// Result of rule evaluation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RuleEvaluationResult {
    /// Whether the rule matched (true) or not (false)
    pub matched: bool,
    /// The rule that was evaluated
    pub rule: Rule,
    /// Any actions that should be taken
    pub actions: Vec<Action>,
    /// Timestamp of evaluation
    pub timestamp: u64,
}

/// Evaluates a single rule against the current context
pub fn evaluate_rule(rule: &Rule, context: &RuleContext) -> RuleEvaluationResult {
    if !rule.enabled {
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

    // Check all conditions - all must be true for the rule to match
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
            // If the field doesn't exist in context, condition fails
            all_conditions_met = false;
            break;
        }
    }

    let mut actions = Vec::new();
    if all_conditions_met {
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

/// Evaluates a batch of rules against the current context
pub fn evaluate_rules(rules: &[Rule], context: &RuleContext) -> Vec<RuleEvaluationResult> {
    // Sort rules by priority (lower number = higher priority)
    let mut sorted_rules: Vec<&Rule> = rules.iter().collect();
    sorted_rules.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
    
    let mut results = Vec::new();
    
    for rule in sorted_rules {
        let result = evaluate_rule(rule, context);
        results.push(result);
    }
    
    results
}

/// Evaluates safety interlock rules (critical rules that must be checked first)
pub fn evaluate_safety_interlocks(rules: &[Rule], context: &RuleContext) -> Vec<RuleEvaluationResult> {
    // Filter for safety-related rules (typically those with critical/emergency actions)
    let safety_rules: Vec<&Rule> = rules.iter()
        .filter(|rule| {
            matches!(&rule.action, 
                Action::Alert { severity: AlertSeverity::Critical | AlertSeverity::Emergency, .. } |
                Action::Shutdown { .. })
        })
        .collect();
    
    evaluate_rules(&safety_rules, context)
}

/// Example: Create a rule for high temperature shutdown
pub fn create_high_temperature_shutdown_rule(threshold: f64) -> Rule {
    Rule {
        id: "high_temp_shutdown".to_string(),
        description: "Shut down system if temperature exceeds safe threshold".to_string(),
        conditions: vec![
            Condition {
                field: "temperature".to_string(),
                operator: Operator::GreaterThan,
                value: threshold,
            }
        ],
        action: Action::Shutdown {
            reason: format!("Temperature exceeded {}°C safety threshold", threshold),
        },
        enabled: true,
        priority: 1, // Highest priority
    }
}

/// Example: Create a rule for pressure warning
pub fn create_pressure_warning_rule(threshold: f64) -> Rule {
    Rule {
        id: "pressure_warning".to_string(),
        description: "Warn when pressure approaches dangerous levels".to_string(),
        conditions: vec![
            Condition {
                field: "pressure".to_string(),
                operator: Operator::GreaterThan,
                value: threshold * 0.8, // Warning at 80% of critical
            }
        ],
        action: Action::Alert {
            message: format!("Pressure approaching critical threshold ({} kPa)", threshold),
            severity: AlertSeverity::Warning,
        },
        enabled: true,
        priority: 5, // Medium priority
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_rule_evaluation() {
        // Create a simple rule
        let rule = Rule {
            id: "test_rule".to_string(),
            description: "Test rule".to_string(),
            conditions: vec![
                Condition {
                    field: "temperature".to_string(),
                    operator: Operator::GreaterThan,
                    value: 100.0,
                }
            ],
            action: Action::Alert {
                message: "Temperature too high!".to_string(),
                severity: AlertSeverity::Warning,
            },
            enabled: true,
            priority: 1,
        };
        
        // Create context with temperature below threshold
        let mut context = RuleContext::new();
        context.set_value("temperature".to_string(), 50.0);
        
        let result = evaluate_rule(&rule, &context);
        assert!(!result.matched);
        assert!(result.actions.is_empty());
        
        // Create context with temperature above threshold
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
        
        // Context with high temperature but normal pressure
        let mut context = RuleContext::new();
        context.set_value("temperature".to_string(), 85.0);
        context.set_value("pressure".to_string(), 50.0);
        
        let results = evaluate_safety_interlocks(&rules, &context);
        assert_eq!(results.len(), 1); // Only the temperature rule should match
        assert!(results[0].matched);
        
        // Check that it's the shutdown action
        if let Action::Shutdown { reason } = &results[0].actions[0] {
            assert!(reason.contains("80.0°C"));
        } else {
            panic!("Expected shutdown action");
        }
    }
}
