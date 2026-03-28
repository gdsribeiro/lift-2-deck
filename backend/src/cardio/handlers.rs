use actix_web::{web, HttpMessage, HttpRequest, HttpResponse};
use bigdecimal::BigDecimal;
use std::str::FromStr;
use uuid::Uuid;

use crate::auth::middleware::AuthenticatedUser;
use crate::db::DbPool;
use crate::errors::AppError;

use super::dto::{CardioLogResponse, CreateCardioRequest};
use super::models::NewCardioLog;
use super::repository;

fn get_user(req: &HttpRequest) -> Result<AuthenticatedUser, AppError> {
    req.extensions()
        .get::<AuthenticatedUser>()
        .cloned()
        .ok_or(AppError::Unauthorized)
}

pub async fn list(
    req: HttpRequest,
    pool: web::Data<DbPool>,
) -> Result<HttpResponse, AppError> {
    let user = get_user(&req)?;
    let mut conn = pool.get().map_err(|e| AppError::DatabaseError(e.to_string()))?;
    let logs = repository::find_all_by_user(&mut conn, user.user_id)?;
    let response: Vec<CardioLogResponse> = logs.into_iter().map(CardioLogResponse::from).collect();
    Ok(HttpResponse::Ok().json(response))
}

pub async fn create(
    req: HttpRequest,
    pool: web::Data<DbPool>,
    body: web::Json<CreateCardioRequest>,
) -> Result<HttpResponse, AppError> {
    let user = get_user(&req)?;
    let mut conn = pool.get().map_err(|e| AppError::DatabaseError(e.to_string()))?;

    let new_log = NewCardioLog {
        user_id: user.user_id,
        activity: body.activity.clone(),
        duration_min: body.duration_min,
        distance_km: body.distance_km.map(|d| BigDecimal::from_str(&d.to_string()).unwrap_or_default()),
        pace_min_km: body.pace_min_km.map(|p| BigDecimal::from_str(&p.to_string()).unwrap_or_default()),
        notes: body.notes.clone(),
    };

    let log = repository::create(&mut conn, new_log)?;
    let response: CardioLogResponse = log.into();
    Ok(HttpResponse::Created().json(response))
}

pub async fn delete(
    req: HttpRequest,
    pool: web::Data<DbPool>,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let user = get_user(&req)?;
    let log_id = path.into_inner();
    let mut conn = pool.get().map_err(|e| AppError::DatabaseError(e.to_string()))?;
    repository::delete(&mut conn, log_id, user.user_id)?;
    Ok(HttpResponse::NoContent().finish())
}
