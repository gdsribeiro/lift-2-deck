use actix_web::{web, HttpMessage, HttpRequest, HttpResponse};
use uuid::Uuid;

use crate::auth::middleware::AuthenticatedUser;
use crate::db::DbPool;
use crate::errors::AppError;

use super::dto::{CatalogQuery, CatalogResponse, CreateCatalogRequest};
use super::models::NewCatalogExercise;
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
    query: web::Query<CatalogQuery>,
) -> Result<HttpResponse, AppError> {
    let user = get_user(&req)?;
    let mut conn = pool.get().map_err(|e| AppError::DatabaseError(e.to_string()))?;

    let items = repository::find_all(
        &mut conn,
        user.user_id,
        query.category.as_deref(),
        query.q.as_deref(),
    )?;

    let response: Vec<CatalogResponse> = items
        .into_iter()
        .map(|item| CatalogResponse {
            id: item.id,
            name: item.name,
            category: item.category,
            exercise_type: item.exercise_type,
        })
        .collect();

    Ok(HttpResponse::Ok().json(response))
}

pub async fn create(
    req: HttpRequest,
    pool: web::Data<DbPool>,
    body: web::Json<CreateCatalogRequest>,
) -> Result<HttpResponse, AppError> {
    let user = get_user(&req)?;
    let mut conn = pool.get().map_err(|e| AppError::DatabaseError(e.to_string()))?;

    let new = NewCatalogExercise {
        user_id: user.user_id,
        name: body.name.clone(),
        category: body.category.clone(),
        exercise_type: body.exercise_type.clone().unwrap_or_else(|| "strength".to_string()),
    };

    let item = repository::create(&mut conn, new)?;

    Ok(HttpResponse::Created().json(CatalogResponse {
        id: item.id,
        name: item.name,
        category: item.category,
        exercise_type: item.exercise_type,
    }))
}

pub async fn delete(
    req: HttpRequest,
    pool: web::Data<DbPool>,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let user = get_user(&req)?;
    let id = path.into_inner();
    let mut conn = pool.get().map_err(|e| AppError::DatabaseError(e.to_string()))?;

    repository::delete(&mut conn, id, user.user_id)?;
    Ok(HttpResponse::NoContent().finish())
}
