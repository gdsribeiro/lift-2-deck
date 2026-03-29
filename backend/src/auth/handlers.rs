use actix_web::{cookie, web, HttpMessage, HttpRequest, HttpResponse};
use chrono::Utc;
use diesel::prelude::*;
use uuid::Uuid;

use crate::db::DbPool;
use crate::errors::AppError;
use crate::schema::{refresh_tokens, users};

use super::dto::{AuthResponse, LoginRequest, RegisterRequest, UpdateProfileRequest};
use super::middleware::{generate_jwt, generate_refresh_token, AuthenticatedUser};
use super::models::NewUser;
use super::supabase::SupabaseClient;

pub async fn register(
    pool: web::Data<DbPool>,
    supabase: web::Data<SupabaseClient>,
    jwt_secret: web::Data<String>,
    body: web::Json<RegisterRequest>,
) -> Result<HttpResponse, AppError> {
    if body.email.len() > 254 || !body.email.contains('@') {
        return Err(AppError::BadRequest("Invalid email format".to_string()));
    }
    if body.password.len() < 6 || body.password.len() > 128 {
        return Err(AppError::BadRequest("Password must be between 6 and 128 characters".to_string()));
    }

    let mut conn = pool
        .get()
        .map_err(|e| AppError::DatabaseError(e.to_string()))?;

    let exists: bool = diesel::select(diesel::dsl::exists(
        users::table.filter(users::email.eq(&body.email)),
    ))
    .get_result(&mut conn)?;

    if exists {
        return Err(AppError::BadRequest("Email already registered".to_string()));
    }

    let user_id = supabase.sign_up(&body.email, &body.password).await?;
    let new_user = NewUser {
        id: user_id,
        email: body.email.clone(),
    };
    diesel::insert_into(users::table)
        .values(&new_user)
        .execute(&mut conn)?;

    let (access_token, expires_in) = generate_jwt(user_id, &body.email, &jwt_secret)?;
    let refresh_token = generate_refresh_token();

    diesel::insert_into(refresh_tokens::table)
        .values((
            refresh_tokens::user_id.eq(user_id),
            refresh_tokens::token.eq(&refresh_token),
            refresh_tokens::expires_at.eq(Utc::now() + chrono::Duration::days(7)),
        ))
        .execute(&mut conn)?;

    let cookie = build_refresh_cookie(&refresh_token);

    Ok(HttpResponse::Ok()
        .cookie(cookie)
        .json(AuthResponse {
            access_token,
            expires_in,
        }))
}

pub async fn login(
    pool: web::Data<DbPool>,
    supabase: web::Data<SupabaseClient>,
    jwt_secret: web::Data<String>,
    body: web::Json<LoginRequest>,
) -> Result<HttpResponse, AppError> {
    let mut conn = pool
        .get()
        .map_err(|e| AppError::DatabaseError(e.to_string()))?;

    let user_id = supabase.sign_in(&body.email, &body.password).await?;

    // Ensure local user row exists
    let user_exists: bool = diesel::select(diesel::dsl::exists(
        users::table.filter(users::id.eq(user_id)),
    ))
    .get_result(&mut conn)?;

    if !user_exists {
        let new_user = NewUser {
            id: user_id,
            email: body.email.clone(),
        };
        diesel::insert_into(users::table)
            .values(&new_user)
            .execute(&mut conn)?;
    }

    // #5: Clear old refresh tokens for this user before issuing a new one
    diesel::delete(refresh_tokens::table.filter(refresh_tokens::user_id.eq(user_id)))
        .execute(&mut conn)?;

    let (access_token, expires_in) = generate_jwt(user_id, &body.email, &jwt_secret)?;
    let refresh_token = generate_refresh_token();

    diesel::insert_into(refresh_tokens::table)
        .values((
            refresh_tokens::user_id.eq(user_id),
            refresh_tokens::token.eq(&refresh_token),
            refresh_tokens::expires_at.eq(Utc::now() + chrono::Duration::days(7)),
        ))
        .execute(&mut conn)?;

    let cookie = build_refresh_cookie(&refresh_token);

    Ok(HttpResponse::Ok()
        .cookie(cookie)
        .json(AuthResponse {
            access_token,
            expires_in,
        }))
}

pub async fn refresh(
    req: HttpRequest,
    pool: web::Data<DbPool>,
    jwt_secret: web::Data<String>,
) -> Result<HttpResponse, AppError> {
    let refresh_token_value = req
        .cookie("refresh_token")
        .ok_or(AppError::Unauthorized)?
        .value()
        .to_string();

    let mut conn = pool
        .get()
        .map_err(|e| AppError::DatabaseError(e.to_string()))?;

    let stored: (Uuid, String) = refresh_tokens::table
        .filter(refresh_tokens::token.eq(&refresh_token_value))
        .filter(refresh_tokens::expires_at.gt(chrono::Utc::now()))
        .select((refresh_tokens::user_id, refresh_tokens::token))
        .first(&mut conn)
        .map_err(|_| AppError::Unauthorized)?;

    let user_id = stored.0;

    diesel::delete(refresh_tokens::table.filter(refresh_tokens::token.eq(&refresh_token_value)))
        .execute(&mut conn)?;

    let user: super::models::User = users::table
        .filter(users::id.eq(user_id))
        .first(&mut conn)?;

    let (access_token, expires_in) = generate_jwt(user_id, &user.email, &jwt_secret)?;
    let new_refresh = generate_refresh_token();

    diesel::insert_into(refresh_tokens::table)
        .values((
            refresh_tokens::user_id.eq(user_id),
            refresh_tokens::token.eq(&new_refresh),
            refresh_tokens::expires_at.eq(chrono::Utc::now() + chrono::Duration::days(7)),
        ))
        .execute(&mut conn)?;

    let cookie = build_refresh_cookie(&new_refresh);

    Ok(HttpResponse::Ok()
        .cookie(cookie)
        .json(AuthResponse {
            access_token,
            expires_in,
        }))
}

// #4: Logout now invalidates the refresh token in the database
pub async fn logout(
    req: HttpRequest,
    pool: web::Data<DbPool>,
) -> Result<HttpResponse, AppError> {
    if let Some(token_cookie) = req.cookie("refresh_token") {
        if let Ok(mut conn) = pool.get() {
            diesel::delete(
                refresh_tokens::table.filter(refresh_tokens::token.eq(token_cookie.value())),
            )
            .execute(&mut conn)
            .ok();
        }
    }

    let cookie = cookie::Cookie::build("refresh_token", "")
        .path("/")
        .http_only(true)
        .secure(true)
        .same_site(cookie::SameSite::Lax)
        .max_age(cookie::time::Duration::ZERO)
        .finish();

    Ok(HttpResponse::Ok().cookie(cookie).finish())
}

pub async fn me(req: HttpRequest) -> Result<HttpResponse, AppError> {
    let user = req
        .extensions()
        .get::<AuthenticatedUser>()
        .cloned()
        .ok_or(AppError::Unauthorized)?;

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "id": user.user_id,
        "email": user.email,
    })))
}

// #7: Validate email format before updating
pub async fn update_profile(
    req: HttpRequest,
    pool: web::Data<DbPool>,
    body: web::Json<UpdateProfileRequest>,
) -> Result<HttpResponse, AppError> {
    if body.email.len() > 254 || !body.email.contains('@') {
        return Err(AppError::BadRequest("Invalid email format".to_string()));
    }

    let user = req
        .extensions()
        .get::<AuthenticatedUser>()
        .cloned()
        .ok_or(AppError::Unauthorized)?;

    let mut conn = pool.get().map_err(|e| AppError::DatabaseError(e.to_string()))?;

    diesel::update(users::table.filter(users::id.eq(user.user_id)))
        .set(users::email.eq(&body.email))
        .execute(&mut conn)?;

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "id": user.user_id,
        "email": body.email,
    })))
}

// #14: Delete account also deletes Supabase auth user
pub async fn delete_account(
    req: HttpRequest,
    pool: web::Data<DbPool>,
    supabase: web::Data<SupabaseClient>,
) -> Result<HttpResponse, AppError> {
    let user = req
        .extensions()
        .get::<AuthenticatedUser>()
        .cloned()
        .ok_or(AppError::Unauthorized)?;

    let mut conn = pool.get().map_err(|e| AppError::DatabaseError(e.to_string()))?;

    diesel::delete(refresh_tokens::table.filter(refresh_tokens::user_id.eq(user.user_id)))
        .execute(&mut conn)?;

    // CASCADE handles plans, exercises, sessions, logs, catalog
    diesel::delete(users::table.filter(users::id.eq(user.user_id)))
        .execute(&mut conn)?;

    // Best-effort delete from Supabase Auth
    supabase.delete_user(user.user_id).await.ok();

    Ok(HttpResponse::NoContent().finish())
}

// #3: Added .secure(true) to prevent cookie leaking over HTTP
fn build_refresh_cookie(token: &str) -> cookie::Cookie<'static> {
    cookie::Cookie::build("refresh_token", token.to_string())
        .path("/")
        .http_only(true)
        .secure(true)
        .same_site(cookie::SameSite::Lax)
        .max_age(cookie::time::Duration::days(7))
        .finish()
}
