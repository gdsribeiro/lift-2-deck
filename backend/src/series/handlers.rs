use actix_web::{web, HttpMessage, HttpRequest, HttpResponse};
use diesel::prelude::*;
use uuid::Uuid;

use crate::auth::middleware::AuthenticatedUser;
use crate::db::DbPool;
use crate::errors::AppError;
use crate::plans::repository as plan_repo;
use crate::schema::series as series_table;

use super::dto::{CreateSeriesRequest, ReorderItem, UpdateSeriesRequest};
use super::models::{NewSeries, UpdateSeries};
use super::repository;

fn get_user(req: &HttpRequest) -> Result<AuthenticatedUser, AppError> {
    req.extensions()
        .get::<AuthenticatedUser>()
        .cloned()
        .ok_or(AppError::Unauthorized)
}

fn verify_series_ownership(
    conn: &mut diesel::PgConnection,
    series_id: Uuid,
    user_id: Uuid,
) -> Result<(), AppError> {
    let plan_id: Uuid = series_table::table
        .filter(series_table::id.eq(series_id))
        .select(series_table::plan_id)
        .first(conn)?;
    plan_repo::find_by_id(conn, plan_id, user_id)?;
    Ok(())
}

pub async fn create(
    req: HttpRequest,
    pool: web::Data<DbPool>,
    path: web::Path<Uuid>,
    body: web::Json<CreateSeriesRequest>,
) -> Result<HttpResponse, AppError> {
    let user = get_user(&req)?;
    let plan_id = path.into_inner();
    let mut conn = pool.get().map_err(|e| AppError::DatabaseError(e.to_string()))?;

    plan_repo::find_by_id(&mut conn, plan_id, user.user_id)?;

    let new_series = NewSeries {
        plan_id,
        name: body.name.clone(),
        order_index: body.order_index,
    };

    let series = repository::create(&mut conn, new_series)?;
    Ok(HttpResponse::Created().json(series))
}

pub async fn update(
    req: HttpRequest,
    pool: web::Data<DbPool>,
    path: web::Path<Uuid>,
    body: web::Json<UpdateSeriesRequest>,
) -> Result<HttpResponse, AppError> {
    let user = get_user(&req)?;
    let series_id = path.into_inner();
    let mut conn = pool.get().map_err(|e| AppError::DatabaseError(e.to_string()))?;

    verify_series_ownership(&mut conn, series_id, user.user_id)?;

    let changeset = UpdateSeries {
        name: body.name.clone(),
        order_index: body.order_index,
    };

    let series = repository::update(&mut conn, series_id, changeset)?;
    Ok(HttpResponse::Ok().json(series))
}

pub async fn delete(
    req: HttpRequest,
    pool: web::Data<DbPool>,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let user = get_user(&req)?;
    let series_id = path.into_inner();
    let mut conn = pool.get().map_err(|e| AppError::DatabaseError(e.to_string()))?;

    verify_series_ownership(&mut conn, series_id, user.user_id)?;

    repository::delete(&mut conn, series_id)?;
    Ok(HttpResponse::NoContent().finish())
}

pub async fn reorder(
    req: HttpRequest,
    pool: web::Data<DbPool>,
    body: web::Json<Vec<ReorderItem>>,
) -> Result<HttpResponse, AppError> {
    let user = get_user(&req)?;
    let mut conn = pool.get().map_err(|e| AppError::DatabaseError(e.to_string()))?;

    for item in body.iter() {
        verify_series_ownership(&mut conn, item.id, user.user_id)?;
    }

    let items: Vec<(Uuid, i32)> = body.iter().map(|i| (i.id, i.order_index)).collect();
    repository::reorder(&mut conn, &items)?;
    Ok(HttpResponse::Ok().finish())
}
