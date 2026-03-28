use actix_web::{web, HttpMessage, HttpRequest, HttpResponse};
use diesel::prelude::*;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::auth::middleware::AuthenticatedUser;
use crate::db::DbPool;
use crate::errors::AppError;
use crate::schema::{series, session_logs, workout_sessions};
use crate::sessions::dto::SessionLogResponse;
use crate::sessions::models::{SessionLog, WorkoutSession};

#[derive(Deserialize)]
pub struct HistoryQuery {
    pub page: Option<i64>,
    pub limit: Option<i64>,
}

#[derive(Serialize)]
struct HistoryResponse {
    data: Vec<SessionSummary>,
    page: i64,
    total: i64,
}

#[derive(Serialize)]
struct SessionSummary {
    #[serde(flatten)]
    session: WorkoutSession,
    series_name: Option<String>,
    logs: Vec<SessionLogResponse>,
}

fn get_user(req: &HttpRequest) -> Result<AuthenticatedUser, AppError> {
    req.extensions()
        .get::<AuthenticatedUser>()
        .cloned()
        .ok_or(AppError::Unauthorized)
}

pub async fn list(
    req: HttpRequest,
    pool: web::Data<DbPool>,
    query: web::Query<HistoryQuery>,
) -> Result<HttpResponse, AppError> {
    let user = get_user(&req)?;
    let mut conn = pool.get().map_err(|e| AppError::DatabaseError(e.to_string()))?;

    let page = query.page.unwrap_or(1).max(1);
    let limit = query.limit.unwrap_or(20).min(100);
    let offset = (page - 1) * limit;

    let total: i64 = workout_sessions::table
        .filter(workout_sessions::user_id.eq(user.user_id))
        .filter(workout_sessions::finished_at.is_not_null())
        .count()
        .get_result(&mut conn)?;

    let sessions = workout_sessions::table
        .filter(workout_sessions::user_id.eq(user.user_id))
        .filter(workout_sessions::finished_at.is_not_null())
        .order(workout_sessions::started_at.desc())
        .offset(offset)
        .limit(limit)
        .load::<WorkoutSession>(&mut conn)?;

    let session_ids: Vec<Uuid> = sessions.iter().map(|s| s.id).collect();

    let logs = session_logs::table
        .filter(session_logs::session_id.eq_any(&session_ids))
        .order(session_logs::logged_at.asc())
        .load::<SessionLog>(&mut conn)?;

    let series_ids: Vec<Uuid> = sessions.iter().filter_map(|s| s.series_id).collect();

    let series_names: Vec<(Uuid, String)> = if !series_ids.is_empty() {
        series::table
            .filter(series::id.eq_any(&series_ids))
            .select((series::id, series::name))
            .load(&mut conn)?
    } else {
        vec![]
    };

    let data: Vec<SessionSummary> = sessions
        .into_iter()
        .map(|session| {
            let session_logs: Vec<SessionLogResponse> = logs
                .iter()
                .filter(|l| l.session_id == session.id)
                .cloned()
                .map(SessionLogResponse::from)
                .collect();

            let series_name = session
                .series_id
                .and_then(|sid| series_names.iter().find(|(id, _)| *id == sid))
                .map(|(_, name)| name.clone());

            SessionSummary {
                session,
                series_name,
                logs: session_logs,
            }
        })
        .collect();

    Ok(HttpResponse::Ok().json(HistoryResponse { data, page, total }))
}

pub async fn detail(
    req: HttpRequest,
    pool: web::Data<DbPool>,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let user = get_user(&req)?;
    let session_id = path.into_inner();
    let mut conn = pool.get().map_err(|e| AppError::DatabaseError(e.to_string()))?;

    let session = workout_sessions::table
        .filter(workout_sessions::id.eq(session_id))
        .filter(workout_sessions::user_id.eq(user.user_id))
        .first::<WorkoutSession>(&mut conn)?;

    let logs: Vec<SessionLogResponse> = session_logs::table
        .filter(session_logs::session_id.eq(session_id))
        .order(session_logs::logged_at.asc())
        .load::<SessionLog>(&mut conn)?
        .into_iter()
        .map(SessionLogResponse::from)
        .collect();

    let series_name: Option<String> = session.series_id.and_then(|sid| {
        series::table
            .filter(series::id.eq(sid))
            .select(series::name)
            .first::<String>(&mut conn)
            .ok()
    });

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "id": session.id,
        "user_id": session.user_id,
        "series_id": session.series_id,
        "started_at": session.started_at,
        "finished_at": session.finished_at,
        "notes": session.notes,
        "ai_feedback": session.ai_feedback,
        "series_name": series_name,
        "logs": logs,
    })))
}
