use actix_web::{cookie, web, HttpMessage, HttpRequest, HttpResponse};
use chrono::Utc;
use diesel::prelude::*;
use uuid::Uuid;

use crate::config::AuthMode;
use crate::db::DbPool;
use crate::errors::AppError;
use crate::schema::{refresh_tokens, users};

use super::dto::{AuthResponse, LoginRequest, RegisterRequest};
use super::middleware::{generate_jwt, generate_refresh_token, AuthenticatedUser};
use super::models::NewUser;
use super::supabase::SupabaseClient;

pub async fn register(
    pool: web::Data<DbPool>,
    supabase: Option<web::Data<SupabaseClient>>,
    auth_mode: web::Data<AuthMode>,
    jwt_secret: web::Data<String>,
    body: web::Json<RegisterRequest>,
) -> Result<HttpResponse, AppError> {
    let mut conn = pool
        .get()
        .map_err(|e| AppError::DatabaseError(e.to_string()))?;

    // Check if email already exists
    let exists: bool = diesel::select(diesel::dsl::exists(
        users::table.filter(users::email.eq(&body.email)),
    ))
    .get_result(&mut conn)?;

    if exists {
        return Err(AppError::BadRequest("Email already registered".to_string()));
    }

    let user_id = match auth_mode.get_ref() {
        AuthMode::Local => {
            let hash = bcrypt::hash(&body.password, bcrypt::DEFAULT_COST)
                .map_err(|e| AppError::InternalError(e.to_string()))?;
            let id = Uuid::new_v4();
            let new_user = NewUser {
                id,
                email: body.email.clone(),
                password_hash: Some(hash),
            };
            diesel::insert_into(users::table)
                .values(&new_user)
                .execute(&mut conn)?;
            id
        }
        AuthMode::Supabase => {
            let supabase = supabase.ok_or(AppError::InternalError(
                "Supabase client not configured".to_string(),
            ))?;
            let id = supabase.sign_up(&body.email, &body.password).await?;
            let new_user = NewUser {
                id,
                email: body.email.clone(),
                password_hash: None,
            };
            diesel::insert_into(users::table)
                .values(&new_user)
                .execute(&mut conn)?;
            id
        }
    };

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
    supabase: Option<web::Data<SupabaseClient>>,
    auth_mode: web::Data<AuthMode>,
    jwt_secret: web::Data<String>,
    body: web::Json<LoginRequest>,
) -> Result<HttpResponse, AppError> {
    let mut conn = pool
        .get()
        .map_err(|e| AppError::DatabaseError(e.to_string()))?;

    let user_id = match auth_mode.get_ref() {
        AuthMode::Local => {
            let user: super::models::User = users::table
                .filter(users::email.eq(&body.email))
                .first(&mut conn)
                .map_err(|_| AppError::Unauthorized)?;

            let hash = user
                .password_hash
                .as_deref()
                .ok_or(AppError::Unauthorized)?;

            let valid = bcrypt::verify(&body.password, hash)
                .map_err(|_| AppError::Unauthorized)?;

            if !valid {
                return Err(AppError::Unauthorized);
            }

            user.id
        }
        AuthMode::Supabase => {
            let supabase = supabase.ok_or(AppError::InternalError(
                "Supabase client not configured".to_string(),
            ))?;
            let id = supabase.sign_in(&body.email, &body.password).await?;

            // Ensure local user row exists
            let user_exists: bool = diesel::select(diesel::dsl::exists(
                users::table.filter(users::id.eq(id)),
            ))
            .get_result(&mut conn)?;

            if !user_exists {
                let new_user = NewUser {
                    id,
                    email: body.email.clone(),
                    password_hash: None,
                };
                diesel::insert_into(users::table)
                    .values(&new_user)
                    .execute(&mut conn)?;
            }

            id
        }
    };

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

pub async fn logout() -> Result<HttpResponse, AppError> {
    let cookie = cookie::Cookie::build("refresh_token", "")
        .path("/")
        .http_only(true)
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

fn build_refresh_cookie(token: &str) -> cookie::Cookie<'static> {
    cookie::Cookie::build("refresh_token", token.to_string())
        .path("/")
        .http_only(true)
        .same_site(cookie::SameSite::Lax)
        .max_age(cookie::time::Duration::days(7))
        .finish()
}
