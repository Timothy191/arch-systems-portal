//! Zen Engine integration — wraps the gorules/zen rule engine as an optional backend.
//!
//! The Zen Engine evaluates JSON Decision Model (JDM) graphs, making it suitable for
//! complex business rules, compliance checks, and decision logic that is authored
//! by analysts rather than developers.
//!
//! # Example
//! ```rust,ignore
//! use logic_engine::zen::ZenDecisionEngine;
//!
//! let engine = ZenDecisionEngine::new();
//! let result = engine.evaluate_jdm(json!({
//!   "id": "temperature_check",
//!   "nodes": [{ ... }]
//! }), json!({"temperature": 85.0})).await;
//! ```

use serde_json::Value;
use std::sync::Arc;
use thiserror::Error;
use tracing::{debug, info, instrument};
use zen_engine::{DecisionEngine, model::DecisionContent};

/// Errors from the Zen Engine integration
#[derive(Error, Debug)]
pub enum ZenError {
    #[error("Failed to parse decision content: {0}")]
    ContentParseError(String),

    #[error("Decision evaluation failed: {0}")]
    EvaluationError(String),

    #[error("Decision not loaded: {0}")]
    NotLoaded(String),

    #[error("Engine error: {0}")]
    EngineError(String),
}

/// Wraps the gorules/zen DecisionEngine for evaluating JDM decision graphs
pub struct ZenDecisionEngine {
    /// The underlying zen-engine instance (shared across evaluations)
    engine: Arc<DecisionEngine<'static>>,
}

impl ZenDecisionEngine {
    /// Create a new Zen Decision Engine
    ///
    /// Uses the default engine configuration.
    pub fn new() -> Self {
        let engine = DecisionEngine::default();
        info!("ZenDecisionEngine initialized");
        Self {
            engine: Arc::new(engine),
        }
    }

    /// Evaluate a JDM decision graph against the given context
    ///
    /// # Arguments
    /// * `decision_json` - A JSON value representing the JDM decision content
    /// * `context` - A JSON value with the input context for evaluation
    #[instrument(skip(self, decision_json, context))]
    pub async fn evaluate_jdm(
        &self,
        decision_json: Value,
        context: Value,
    ) -> Result<Value, ZenError> {
        let content: DecisionContent = serde_json::from_value(decision_json)
            .map_err(|e| ZenError::ContentParseError(e.to_string()))?;

        let decision = self.engine.create_decision(content.into());

        let result = decision
            .evaluate(&context)
            .await
            .map_err(|e| ZenError::EvaluationError(e.to_string()))?;

        debug!("Zen decision evaluated successfully");
        Ok(result)
    }

    /// Evaluate a decision from raw JSON string
    #[instrument(skip(self))]
    pub async fn evaluate_jdm_str(
        &self,
        decision_json_str: &str,
        context: &str,
    ) -> Result<Value, ZenError> {
        let decision_json: Value = serde_json::from_str(decision_json_str)
            .map_err(|e| ZenError::ContentParseError(e.to_string()))?;
        let context_value: Value = serde_json::from_str(context)
            .map_err(|e| ZenError::ContentParseError(e.to_string()))?;

        self.evaluate_jdm(decision_json, context_value).await
    }

    /// Evaluate multiple decisions in parallel
    #[instrument(skip(self, decisions))]
    pub async fn evaluate_batch(
        &self,
        decisions: Vec<(String, Value, Value)>, // (id, decision_json, context)
    ) -> Vec<(String, Result<Value, ZenError>)> {
        let engine = self.engine.clone();
        let mut handles = Vec::new();

        for (id, decision_json, context) in decisions {
            let engine = engine.clone();
            handles.push(tokio::spawn(async move {
                let content: Result<DecisionContent, _> =
                    serde_json::from_value(decision_json);
                let content = match content {
                    Ok(c) => c,
                    Err(e) => {
                        return (
                            id,
                            Err(ZenError::ContentParseError(e.to_string())),
                        );
                    }
                };

                let decision = engine.create_decision(content.into());
                let result = decision.evaluate(&context).await;

                match result {
                    Ok(r) => (id, Ok(r)),
                    Err(e) => (id, Err(ZenError::EvaluationError(e.to_string()))),
                }
            }));
        }

        let mut results = Vec::new();
        for handle in handles {
            if let Ok(r) = handle.await {
                results.push(r);
            }
        }
        results
    }
}

impl Default for ZenDecisionEngine {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    /// Example JDM decision: temperature check
    /// Evaluates if temperature > 80 => TRUE
    fn sample_temp_decision() -> Value {
        json!({
            "id": "temp_check",
            "name": "High Temperature Check",
            "nodes": [
                {
                    "id": "input1",
                    "name": "Temperature Input",
                    "type": "input",
                    "outputType": "number"
                },
                {
                    "id": "decision1",
                    "name": "High Temp Check",
                    "type": "decision",
                    "inputs": ["input1"],
                    "default": false,
                    "rules": [
                        {
                            "name": "Over 80C",
                            "priority": 1,
                            "condition": {
                                "fact": "temperature",
                                "operator": "greaterThanInclusive",
                                "value": 80
                            },
                            "event": {
                                "type": "alert",
                                "params": {
                                    "message": "High temperature detected"
                                }
                            }
                        }
                    ]
                }
            ]
        })
    }

    #[tokio::test]
    async fn test_zen_engine_evaluate() {
        let engine = ZenDecisionEngine::new();
        let decision = sample_temp_decision();
        let context = json!({ "temperature": 85 });

        let result = engine.evaluate_jdm(decision, context).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_zen_engine_no_match() {
        let engine = ZenDecisionEngine::new();
        let decision = sample_temp_decision();
        let context = json!({ "temperature": 25 });

        let result = engine.evaluate_jdm(decision, context).await;
        assert!(result.is_ok());
    }

    #[ignore]
    #[tokio::test]
    async fn test_invalid_decision_content() {
        // Requires zen-engine to reject malformed content — behavior depends on the crate version
        let engine = ZenDecisionEngine::new();
        let invalid = json!({ "not_valid": true });
        let context = json!({});

        let result = engine.evaluate_jdm(invalid, context).await;
        assert!(result.is_err());
    }
}
