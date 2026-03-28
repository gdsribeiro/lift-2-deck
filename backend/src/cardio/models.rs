use bigdecimal::BigDecimal;
use chrono::{DateTime, Utc};
use diesel::prelude::*;
use serde::Serialize;
use uuid::Uuid;

use crate::schema::cardio_logs;

#[derive(Queryable, Selectable, Serialize, Clone)]
#[diesel(table_name = cardio_logs)]
pub struct CardioLog {
    pub id: Uuid,
    pub user_id: Uuid,
    pub activity: String,
    pub duration_min: i32,
    pub distance_km: Option<BigDecimal>,
    pub pace_min_km: Option<BigDecimal>,
    pub logged_at: DateTime<Utc>,
    pub notes: Option<String>,
}

#[derive(Insertable)]
#[diesel(table_name = cardio_logs)]
pub struct NewCardioLog {
    pub user_id: Uuid,
    pub activity: String,
    pub duration_min: i32,
    pub distance_km: Option<BigDecimal>,
    pub pace_min_km: Option<BigDecimal>,
    pub notes: Option<String>,
}
