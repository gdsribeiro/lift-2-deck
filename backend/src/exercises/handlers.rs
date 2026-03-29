use actix_web::{web, HttpMessage, HttpRequest, HttpResponse};
use diesel::prelude::*;
use uuid::Uuid;

use crate::auth::middleware::AuthenticatedUser;
use crate::db::DbPool;
use crate::errors::AppError;
use crate::plans::repository as plan_repo;
use crate::schema::exercises as exercises_table;

use super::dto::{CreateExerciseRequest, ReorderItem, UpdateExerciseRequest};
use super::models::{NewExercise, UpdateExercise};
use super::repository;

fn get_user(req: &HttpRequest) -> Result<AuthenticatedUser, AppError> {
    req.extensions()
        .get::<AuthenticatedUser>()
        .cloned()
        .ok_or(AppError::Unauthorized)
}

fn verify_exercise_ownership(
    conn: &mut diesel::PgConnection,
    exercise_id: Uuid,
    user_id: Uuid,
) -> Result<(), AppError> {
    let plan_id: Uuid = exercises_table::table
        .filter(exercises_table::id.eq(exercise_id))
        .select(exercises_table::plan_id)
        .first(conn)?;
    plan_repo::find_by_id(conn, plan_id, user_id)?;
    Ok(())
}

pub async fn create(
    req: HttpRequest,
    pool: web::Data<DbPool>,
    path: web::Path<Uuid>,
    body: web::Json<CreateExerciseRequest>,
) -> Result<HttpResponse, AppError> {
    let user = get_user(&req)?;
    let plan_id = path.into_inner();
    let mut conn = pool.get().map_err(|e| AppError::DatabaseError(e.to_string()))?;

    plan_repo::find_by_id(&mut conn, plan_id, user.user_id)?;
    body.validate()?;

    let new_exercise = NewExercise {
        plan_id,
        name: body.name.clone(),
        muscle_group: body.muscle_group.clone(),
        exercise_type: body.exercise_type.clone().unwrap_or_else(|| "strength".to_string()),
        sets: body.sets,
        reps_target: body.reps_target.clone(),
        rest_seconds: body.rest_seconds,
        notes: body.notes.clone(),
        order_index: body.order_index,
    };

    let exercise = repository::create(&mut conn, new_exercise)?;
    Ok(HttpResponse::Created().json(exercise))
}

pub async fn update(
    req: HttpRequest,
    pool: web::Data<DbPool>,
    path: web::Path<Uuid>,
    body: web::Json<UpdateExerciseRequest>,
) -> Result<HttpResponse, AppError> {
    let user = get_user(&req)?;
    let exercise_id = path.into_inner();
    let mut conn = pool.get().map_err(|e| AppError::DatabaseError(e.to_string()))?;

    verify_exercise_ownership(&mut conn, exercise_id, user.user_id)?;

    let changeset = UpdateExercise {
        name: body.name.clone(),
        muscle_group: body.muscle_group.clone(),
        exercise_type: body.exercise_type.clone(),
        sets: body.sets,
        reps_target: body.reps_target.clone(),
        rest_seconds: body.rest_seconds,
        notes: body.notes.as_ref().map(|n| Some(n.clone())),
        order_index: body.order_index,
    };

    let exercise = repository::update(&mut conn, exercise_id, changeset)?;
    Ok(HttpResponse::Ok().json(exercise))
}

pub async fn delete(
    req: HttpRequest,
    pool: web::Data<DbPool>,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let user = get_user(&req)?;
    let exercise_id = path.into_inner();
    let mut conn = pool.get().map_err(|e| AppError::DatabaseError(e.to_string()))?;

    verify_exercise_ownership(&mut conn, exercise_id, user.user_id)?;

    repository::delete(&mut conn, exercise_id)?;
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
        verify_exercise_ownership(&mut conn, item.id, user.user_id)?;
    }

    let items: Vec<(Uuid, i32)> = body.iter().map(|i| (i.id, i.order_index)).collect();
    repository::reorder(&mut conn, &items)?;
    Ok(HttpResponse::NoContent().finish())
}
