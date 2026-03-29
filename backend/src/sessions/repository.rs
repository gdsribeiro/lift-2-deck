use bigdecimal::BigDecimal;
use chrono::Utc;
use diesel::prelude::*;
use std::str::FromStr;
use uuid::Uuid;

use crate::errors::AppError;
use crate::schema::{session_logs, workout_sessions};

use super::models::{NewSessionLog, NewWorkoutSession, SessionLog, WorkoutSession};

pub fn start(conn: &mut PgConnection, new_session: NewWorkoutSession) -> Result<WorkoutSession, AppError> {
    let session = diesel::insert_into(workout_sessions::table)
        .values(&new_session)
        .get_result::<WorkoutSession>(conn)?;
    Ok(session)
}

pub fn find_active(conn: &mut PgConnection, user_id: Uuid) -> Result<Option<WorkoutSession>, AppError> {
    let session = workout_sessions::table
        .filter(workout_sessions::user_id.eq(user_id))
        .filter(workout_sessions::finished_at.is_null())
        .first::<WorkoutSession>(conn)
        .optional()?;
    Ok(session)
}

pub fn finish(
    conn: &mut PgConnection,
    session_id: Uuid,
    user_id: Uuid,
    notes: Option<String>,
) -> Result<WorkoutSession, AppError> {
    let session = diesel::update(
        workout_sessions::table
            .filter(workout_sessions::id.eq(session_id))
            .filter(workout_sessions::user_id.eq(user_id)),
    )
    .set((
        workout_sessions::finished_at.eq(Utc::now()),
        workout_sessions::notes.eq(notes),
    ))
    .get_result::<WorkoutSession>(conn)?;
    Ok(session)
}

pub fn log_set(
    conn: &mut PgConnection,
    session_id: Uuid,
    exercise_id: Option<Uuid>,
    exercise_name: String,
    set_number: i32,
    weight_kg: Option<f64>,
    reps: Option<i32>,
    duration_min: Option<i32>,
    distance_km: Option<f64>,
) -> Result<SessionLog, AppError> {
    let new_log = NewSessionLog {
        session_id,
        exercise_id,
        exercise_name,
        set_number,
        weight_kg: weight_kg.map(|w| BigDecimal::from_str(&w.to_string()).unwrap_or_default()),
        reps,
        duration_min,
        distance_km: distance_km.map(|d| BigDecimal::from_str(&d.to_string()).unwrap_or_default()),
    };

    let log = diesel::insert_into(session_logs::table)
        .values(&new_log)
        .get_result::<SessionLog>(conn)?;
    Ok(log)
}

pub fn delete_log(conn: &mut PgConnection, log_id: Uuid, session_id: Uuid) -> Result<(), AppError> {
    let rows = diesel::delete(
        session_logs::table
            .filter(session_logs::id.eq(log_id))
            .filter(session_logs::session_id.eq(session_id)),
    )
    .execute(conn)?;
    if rows == 0 {
        return Err(AppError::NotFound("Log not found".to_string()));
    }
    Ok(())
}
