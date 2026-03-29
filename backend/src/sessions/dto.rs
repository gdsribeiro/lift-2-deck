use bigdecimal::BigDecimal;
use bigdecimal::ToPrimitive;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::models::SessionLog;

#[derive(Deserialize)]
pub struct StartSessionRequest {
    pub plan_id: Option<Uuid>,
}

#[derive(Deserialize)]
pub struct LogSetRequest {
    pub exercise_id: Option<Uuid>,
    pub exercise_name: String,
    pub set_number: i32,
    pub weight_kg: Option<f64>,
    pub reps: Option<i32>,
    pub duration_min: Option<i32>,
    pub distance_km: Option<f64>,
}

#[derive(Deserialize)]
pub struct FinishSessionRequest {
    pub notes: Option<String>,
    pub logs: Option<Vec<LogSetRequest>>,
}

#[derive(Serialize, Clone)]
pub struct SessionLogResponse {
    pub id: Uuid,
    pub session_id: Uuid,
    pub exercise_id: Option<Uuid>,
    pub exercise_name: String,
    pub set_number: i32,
    pub weight_kg: Option<f64>,
    pub reps: Option<i32>,
    pub duration_min: Option<i32>,
    pub distance_km: Option<f64>,
    pub logged_at: DateTime<Utc>,
}

impl From<SessionLog> for SessionLogResponse {
    fn from(log: SessionLog) -> Self {
        Self {
            id: log.id,
            session_id: log.session_id,
            exercise_id: log.exercise_id,
            exercise_name: log.exercise_name,
            set_number: log.set_number,
            weight_kg: log.weight_kg.as_ref().and_then(BigDecimal::to_f64),
            reps: log.reps,
            duration_min: log.duration_min,
            distance_km: log.distance_km.as_ref().and_then(BigDecimal::to_f64),
            logged_at: log.logged_at,
        }
    }
}
