use actix_web::{web, HttpMessage, HttpRequest, HttpResponse};
use bigdecimal::ToPrimitive;
use diesel::prelude::*;
use uuid::Uuid;

use crate::auth::middleware::AuthenticatedUser;
use crate::db::DbPool;
use crate::errors::AppError;
use crate::groq::client::GroqClient;
use crate::schema::{session_logs, workout_sessions};

use super::dto::{FinishSessionRequest, LogSetRequest, SessionLogResponse, StartSessionRequest};
use super::models::{NewWorkoutSession, SessionLog, WorkoutSession};
use super::repository;

fn get_user(req: &HttpRequest) -> Result<AuthenticatedUser, AppError> {
    req.extensions()
        .get::<AuthenticatedUser>()
        .cloned()
        .ok_or(AppError::Unauthorized)
}

fn verify_session_ownership(
    conn: &mut diesel::PgConnection,
    session_id: Uuid,
    user_id: Uuid,
) -> Result<(), AppError> {
    workout_sessions::table
        .filter(workout_sessions::id.eq(session_id))
        .filter(workout_sessions::user_id.eq(user_id))
        .select(workout_sessions::id)
        .first::<Uuid>(conn)?;
    Ok(())
}

pub async fn start(
    req: HttpRequest,
    pool: web::Data<DbPool>,
    body: web::Json<StartSessionRequest>,
) -> Result<HttpResponse, AppError> {
    let user = get_user(&req)?;
    let mut conn = pool.get().map_err(|e| AppError::DatabaseError(e.to_string()))?;

    if repository::find_active(&mut conn, user.user_id)?.is_some() {
        return Err(AppError::BadRequest(
            "You already have an active session. Finish it first.".to_string(),
        ));
    }

    let new_session = NewWorkoutSession {
        user_id: user.user_id,
        plan_id: body.plan_id,
    };

    let session = repository::start(&mut conn, new_session)?;
    Ok(HttpResponse::Created().json(session))
}

pub async fn get_active(
    req: HttpRequest,
    pool: web::Data<DbPool>,
) -> Result<HttpResponse, AppError> {
    let user = get_user(&req)?;
    let mut conn = pool.get().map_err(|e| AppError::DatabaseError(e.to_string()))?;

    match repository::find_active(&mut conn, user.user_id)? {
        Some(session) => Ok(HttpResponse::Ok().json(session)),
        None => Ok(HttpResponse::Ok().json(serde_json::Value::Null)),
    }
}

pub async fn log_set(
    req: HttpRequest,
    pool: web::Data<DbPool>,
    path: web::Path<Uuid>,
    body: web::Json<LogSetRequest>,
) -> Result<HttpResponse, AppError> {
    let user = get_user(&req)?;
    let session_id = path.into_inner();
    let mut conn = pool.get().map_err(|e| AppError::DatabaseError(e.to_string()))?;

    verify_session_ownership(&mut conn, session_id, user.user_id)?;

    let log = repository::log_set(
        &mut conn,
        session_id,
        body.exercise_id,
        body.exercise_name.clone(),
        body.set_number,
        body.weight_kg,
        body.reps,
        body.duration_min,
        body.distance_km,
    )?;

    let response: SessionLogResponse = log.into();
    Ok(HttpResponse::Created().json(response))
}

pub async fn delete_log(
    req: HttpRequest,
    pool: web::Data<DbPool>,
    path: web::Path<(Uuid, Uuid)>,
) -> Result<HttpResponse, AppError> {
    let user = get_user(&req)?;
    let (session_id, log_id) = path.into_inner();
    let mut conn = pool.get().map_err(|e| AppError::DatabaseError(e.to_string()))?;

    verify_session_ownership(&mut conn, session_id, user.user_id)?;

    repository::delete_log(&mut conn, log_id, session_id)?;
    Ok(HttpResponse::NoContent().finish())
}

pub async fn finish(
    req: HttpRequest,
    pool: web::Data<DbPool>,
    groq: web::Data<GroqClient>,
    path: web::Path<Uuid>,
    body: web::Json<FinishSessionRequest>,
) -> Result<HttpResponse, AppError> {
    let user = get_user(&req)?;
    let session_id = path.into_inner();
    let mut conn = pool.get().map_err(|e| AppError::DatabaseError(e.to_string()))?;

    verify_session_ownership(&mut conn, session_id, user.user_id)?;

    // Insert batch logs sent with the finish request (hybrid model)
    if let Some(ref logs) = body.logs {
        for log_req in logs {
            repository::log_set(
                &mut conn,
                session_id,
                log_req.exercise_id,
                log_req.exercise_name.clone(),
                log_req.set_number,
                log_req.weight_kg,
                log_req.reps,
                log_req.duration_min,
                log_req.distance_km,
            )?;
        }
    }

    repository::finish(&mut conn, session_id, user.user_id, body.notes.clone())?;

    // Collect current session logs
    let current_logs = session_logs::table
        .filter(session_logs::session_id.eq(session_id))
        .order(session_logs::logged_at.asc())
        .load::<SessionLog>(&mut conn)?;

    let session_summary = format_session_logs(&current_logs);

    // Collect recent history (last 5 finished sessions, excluding this one)
    let recent_sessions = workout_sessions::table
        .filter(workout_sessions::user_id.eq(user.user_id))
        .filter(workout_sessions::finished_at.is_not_null())
        .filter(workout_sessions::id.ne(session_id))
        .order(workout_sessions::started_at.desc())
        .limit(5)
        .load::<WorkoutSession>(&mut conn)?;

    let recent_history = if recent_sessions.is_empty() {
        String::new()
    } else {
        let recent_ids: Vec<Uuid> = recent_sessions.iter().map(|s| s.id).collect();
        let recent_logs = session_logs::table
            .filter(session_logs::session_id.eq_any(&recent_ids))
            .order(session_logs::logged_at.asc())
            .load::<SessionLog>(&mut conn)?;

        recent_sessions
            .iter()
            .map(|s| {
                let logs: Vec<&SessionLog> = recent_logs
                    .iter()
                    .filter(|l| l.session_id == s.id)
                    .collect();
                let date = s.started_at.format("%d/%m/%Y").to_string();
                let summary = format_session_log_refs(&logs);
                format!("[{date}]\n{summary}")
            })
            .collect::<Vec<_>>()
            .join("\n\n")
    };

    // Generate AI feedback
    let feedback = match groq.generate_workout_feedback(&session_summary, &recent_history).await {
        Ok(text) => Some(text),
        Err(e) => {
            eprintln!("Groq feedback generation failed: {e}");
            None
        }
    };

    if let Some(ref text) = feedback {
        if let Err(e) = diesel::update(
            workout_sessions::table.filter(workout_sessions::id.eq(session_id)),
        )
        .set(workout_sessions::ai_feedback.eq(text))
        .execute(&mut conn)
        {
            eprintln!("Failed to save ai_feedback to DB: {e}");
        }
    }

    let updated_session = workout_sessions::table
        .filter(workout_sessions::id.eq(session_id))
        .filter(workout_sessions::user_id.eq(user.user_id))
        .first::<WorkoutSession>(&mut conn)?;

    Ok(HttpResponse::Ok().json(updated_session))
}

fn format_session_logs(logs: &[SessionLog]) -> String {
    logs.iter()
        .map(|l| format_single_log(l))
        .collect::<Vec<_>>()
        .join("\n")
}

fn format_session_log_refs(logs: &[&SessionLog]) -> String {
    logs.iter()
        .map(|l| format_single_log(l))
        .collect::<Vec<_>>()
        .join("\n")
}

fn format_single_log(l: &SessionLog) -> String {
    if l.duration_min.is_some() || l.distance_km.is_some() {
        let dur = l.duration_min.map(|d| format!("{d}min")).unwrap_or_default();
        let dist = l.distance_km.as_ref()
            .and_then(|d| d.to_f64())
            .map(|d| format!("{d}km"))
            .unwrap_or_default();
        format!("{} - Set {}: {} {}", l.exercise_name, l.set_number, dur, dist)
    } else {
        let weight = l.weight_kg.as_ref()
            .and_then(|w| w.to_f64())
            .map(|w| format!("{w}kg"))
            .unwrap_or_else(|| "peso corporal".to_string());
        let reps = l.reps.map(|r| r.to_string()).unwrap_or_else(|| "?".to_string());
        format!("{} - Set {}: {} x {} reps", l.exercise_name, l.set_number, weight, reps)
    }
}
