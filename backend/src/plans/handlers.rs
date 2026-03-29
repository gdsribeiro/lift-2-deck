use actix_web::{web, HttpMessage, HttpRequest, HttpResponse};
use uuid::Uuid;

use crate::auth::middleware::AuthenticatedUser;
use crate::db::DbPool;
use crate::errors::AppError;

use super::dto::{CreatePlanRequest, UpdatePlanRequest};
use super::models::{NewTrainingPlan, UpdateTrainingPlan};
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
    let plans = repository::find_all_by_user(&mut conn, user.user_id)?;
    Ok(HttpResponse::Ok().json(plans))
}

pub async fn get_detail(
    req: HttpRequest,
    pool: web::Data<DbPool>,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let user = get_user(&req)?;
    let plan_id = path.into_inner();
    let mut conn = pool.get().map_err(|e| AppError::DatabaseError(e.to_string()))?;

    let plan = repository::find_by_id(&mut conn, plan_id, user.user_id)?;

    use crate::schema::exercises;
    use crate::exercises::models::Exercise;
    use diesel::prelude::*;

    let exercises_list = exercises::table
        .filter(exercises::plan_id.eq(plan_id))
        .order(exercises::order_index.asc())
        .load::<Exercise>(&mut conn)?;

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "id": plan.id,
        "name": plan.name,
        "created_at": plan.created_at,
        "exercises": exercises_list,
    })))
}

pub async fn create(
    req: HttpRequest,
    pool: web::Data<DbPool>,
    body: web::Json<CreatePlanRequest>,
) -> Result<HttpResponse, AppError> {
    let user = get_user(&req)?;
    let mut conn = pool.get().map_err(|e| AppError::DatabaseError(e.to_string()))?;

    let new_plan = NewTrainingPlan {
        user_id: user.user_id,
        name: body.name.clone(),
        description: body.description.clone(),
    };

    let plan = repository::create(&mut conn, new_plan)?;
    Ok(HttpResponse::Created().json(plan))
}

pub async fn update(
    req: HttpRequest,
    pool: web::Data<DbPool>,
    path: web::Path<Uuid>,
    body: web::Json<UpdatePlanRequest>,
) -> Result<HttpResponse, AppError> {
    let user = get_user(&req)?;
    let plan_id = path.into_inner();
    let mut conn = pool.get().map_err(|e| AppError::DatabaseError(e.to_string()))?;

    let changeset = UpdateTrainingPlan {
        name: body.name.clone(),
        description: body.description.as_ref().map(|d| Some(d.clone())),
    };

    let plan = repository::update(&mut conn, plan_id, user.user_id, changeset)?;
    Ok(HttpResponse::Ok().json(plan))
}

pub async fn delete(
    req: HttpRequest,
    pool: web::Data<DbPool>,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let user = get_user(&req)?;
    let plan_id = path.into_inner();
    let mut conn = pool.get().map_err(|e| AppError::DatabaseError(e.to_string()))?;
    repository::delete(&mut conn, plan_id, user.user_id)?;
    Ok(HttpResponse::NoContent().finish())
}
