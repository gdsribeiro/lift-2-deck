use bigdecimal::BigDecimal;
use chrono::{DateTime, Utc};
use diesel::prelude::*;
use serde::Serialize;
use uuid::Uuid;

use crate::schema::{session_logs, workout_sessions};

#[derive(Queryable, Selectable, Serialize)]
#[diesel(table_name = workout_sessions)]
pub struct WorkoutSession {
    pub id: Uuid,
    #[serde(skip_serializing)]
    pub user_id: Uuid,
    pub started_at: DateTime<Utc>,
    pub finished_at: Option<DateTime<Utc>>,
    pub notes: Option<String>,
    pub ai_feedback: Option<String>,
    pub plan_id: Option<Uuid>,
}

#[derive(Insertable)]
#[diesel(table_name = workout_sessions)]
pub struct NewWorkoutSession {
    pub user_id: Uuid,
    pub plan_id: Option<Uuid>,
}

#[derive(Queryable, Selectable, Serialize, Clone)]
#[diesel(table_name = session_logs)]
pub struct SessionLog {
    pub id: Uuid,
    pub session_id: Uuid,
    pub exercise_id: Option<Uuid>,
    pub exercise_name: String,
    pub set_number: i32,
    pub weight_kg: Option<BigDecimal>,
    pub reps: Option<i32>,
    pub logged_at: DateTime<Utc>,
    pub duration_min: Option<i32>,
    pub distance_km: Option<BigDecimal>,
}

#[derive(Insertable)]
#[diesel(table_name = session_logs)]
pub struct NewSessionLog {
    pub session_id: Uuid,
    pub exercise_id: Option<Uuid>,
    pub exercise_name: String,
    pub set_number: i32,
    pub weight_kg: Option<BigDecimal>,
    pub reps: Option<i32>,
    pub duration_min: Option<i32>,
    pub distance_km: Option<BigDecimal>,
}
