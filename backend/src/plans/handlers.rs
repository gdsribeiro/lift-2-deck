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

    use crate::schema::{series, exercises};
    use crate::series::models::Series;
    use crate::exercises::models::Exercise;
    use diesel::prelude::*;

    let series_list = series::table
        .filter(series::plan_id.eq(plan_id))
        .order(series::order_index.asc())
        .load::<Series>(&mut conn)?;

    let series_ids: Vec<Uuid> = series_list.iter().map(|s| s.id).collect();

    let exercises_list = exercises::table
        .filter(exercises::series_id.eq_any(&series_ids))
        .order(exercises::order_index.asc())
        .load::<Exercise>(&mut conn)?;

    let series_with_exercises: Vec<serde_json::Value> = series_list
        .iter()
        .map(|s| {
            let exs: Vec<&Exercise> = exercises_list
                .iter()
                .filter(|e| e.series_id == s.id)
                .collect();
            serde_json::json!({
                "id": s.id,
                "plan_id": s.plan_id,
                "name": s.name,
                "order_index": s.order_index,
                "exercises": exs,
            })
        })
        .collect();

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "id": plan.id,
        "name": plan.name,
        "description": plan.description,
        "created_at": plan.created_at,
        "series": series_with_exercises,
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
