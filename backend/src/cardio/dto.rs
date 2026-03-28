use bigdecimal::BigDecimal;
use bigdecimal::ToPrimitive;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::models::CardioLog;

#[derive(Deserialize)]
pub struct CreateCardioRequest {
    pub activity: String,
    pub duration_min: i32,
    pub distance_km: Option<f64>,
    pub pace_min_km: Option<f64>,
    pub notes: Option<String>,
}

#[derive(Deserialize)]
pub struct CardioQuery {
    pub from: Option<String>,
    pub to: Option<String>,
}

#[derive(Serialize)]
pub struct CardioLogResponse {
    pub id: Uuid,
    pub user_id: Uuid,
    pub activity: String,
    pub duration_min: i32,
    pub distance_km: Option<f64>,
    pub pace_min_km: Option<f64>,
    pub logged_at: DateTime<Utc>,
    pub notes: Option<String>,
}

impl From<CardioLog> for CardioLogResponse {
    fn from(log: CardioLog) -> Self {
        Self {
            id: log.id,
            user_id: log.user_id,
            activity: log.activity,
            duration_min: log.duration_min,
            distance_km: log.distance_km.as_ref().and_then(BigDecimal::to_f64),
            pace_min_km: log.pace_min_km.as_ref().and_then(BigDecimal::to_f64),
            logged_at: log.logged_at,
            notes: log.notes,
        }
    }
}
