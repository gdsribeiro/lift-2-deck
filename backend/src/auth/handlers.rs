use actix_web::{cookie, web, HttpMessage, HttpRequest, HttpResponse};
use chrono::Utc;
use diesel::prelude::*;
use uuid::Uuid;

use crate::db::DbPool;
use crate::errors::AppError;
use crate::schema::{refresh_tokens, users};

use super::dto::{AuthResponse, LoginRequest, RegisterRequest, UpdateEmailRequest};
use super::middleware::{generate_jwt, generate_refresh_token, AuthenticatedUser};
use super::models::NewUser;
use super::supabase::SupabaseClient;
use crate::profile;

#[derive(Clone)]
pub struct CookieConfig {
    pub secure: bool,
    pub same_site: cookie::SameSite,
}

pub async fn register(
    pool: web::Data<DbPool>,
    supabase: web::Data<SupabaseClient>,
    jwt_secret: web::Data<String>,
    cookie_config: web::Data<CookieConfig>,
    body: web::Json<RegisterRequest>,
) -> Result<HttpResponse, AppError> {
    if body.email.len() > 254 || !body.email.contains('@') {
        return Err(AppError::BadRequest("Invalid email format".to_string()));
    }
    if body.password.len() < 8 || body.password.len() > 128 {
        return Err(AppError::BadRequest("Password must be between 8 and 128 characters".to_string()));
    }
    if !body.password.chars().any(|c| c.is_uppercase()) {
        return Err(AppError::BadRequest("Password must contain at least one uppercase letter".to_string()));
    }
    if !body.password.chars().any(|c| c.is_ascii_digit()) {
        return Err(AppError::BadRequest("Password must contain at least one number".to_string()));
    }
    if !body.password.chars().any(|c| !c.is_alphanumeric()) {
        return Err(AppError::BadRequest("Password must contain at least one symbol".to_string()));
    }

    let first_name = body.first_name.trim().to_string();
    if first_name.is_empty() || first_name.len() > 100 {
        return Err(AppError::BadRequest("First name must be between 1 and 100 characters".to_string()));
    }

    let birth_date = chrono::NaiveDate::parse_from_str(&body.birth_date, "%Y-%m-%d")
        .map_err(|_| AppError::BadRequest("Invalid date format, expected YYYY-MM-DD".to_string()))?;
    profile::handlers::validate_age(&birth_date)?;

    // Validate optional profile_type
    let profile_type = match &body.profile_type {
        Some(pt) if pt == "professional" => Some("professional".to_string()),
        Some(pt) if pt == "regular" => None,
        Some(_) => return Err(AppError::BadRequest("Profile type must be 'regular' or 'professional'".to_string())),
        None => None,
    };

    // Validate CREF if professional
    let cref_number = match (&profile_type, &body.cref_number) {
        (Some(_), Some(cref)) => {
            if cref.trim().is_empty() {
                return Err(AppError::BadRequest("CREF is required for professionals".to_string()));
            }
            Some(cref.trim().to_string())
        }
        _ => None,
    };

    // Validate social links
    let social_links = body.social_links.as_ref()
        .map(|sl| serde_json::to_value(sl).unwrap_or_default());

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

    // Use provided nickname or generate one
    let nickname = match &body.nickname {
        Some(n) if !n.trim().is_empty() => {
            let trimmed = n.trim().to_string();
            if trimmed.len() < 3 || trimmed.len() > 40 {
                return Err(AppError::BadRequest("Nickname must be between 3 and 40 characters".to_string()));
            }
            if !trimmed.chars().all(|c| c.is_ascii_alphanumeric()) {
                return Err(AppError::BadRequest("Nickname must contain only letters and numbers".to_string()));
            }
            if profile::repository::is_nickname_taken(&mut conn, &trimmed)? {
                return Err(AppError::BadRequest("Nickname already taken".to_string()));
            }
            trimmed
        }
        _ => profile::nickname::generate_unique(&mut conn)?,
    };

    let user_id = supabase.sign_up(&body.email, &body.password).await?;
    let new_user = NewUser {
        id: user_id,
        email: body.email.clone(),
        first_name: Some(first_name),
        last_name: body.last_name.as_ref().map(|n| n.trim().to_string()),
        nickname: Some(nickname),
        birth_date: Some(birth_date),
        profile_type,
        cref_number,
        social_links,
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

    let cookie = build_refresh_cookie(&refresh_token, &cookie_config);

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
    cookie_config: web::Data<CookieConfig>,
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
            first_name: None,
            last_name: None,
            nickname: None,
            birth_date: None,
            profile_type: None,
            cref_number: None,
            social_links: None,
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

    let cookie = build_refresh_cookie(&refresh_token, &cookie_config);

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
    cookie_config: web::Data<CookieConfig>,
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

    let cookie = build_refresh_cookie(&new_refresh, &cookie_config);

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
    cookie_config: web::Data<CookieConfig>,
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
        .secure(cookie_config.secure)
        .same_site(cookie_config.same_site)
        .max_age(cookie::time::Duration::ZERO)
        .finish();

    Ok(HttpResponse::Ok().cookie(cookie).finish())
}

pub async fn me(
    req: HttpRequest,
    pool: web::Data<DbPool>,
) -> Result<HttpResponse, AppError> {
    let auth_user = req
        .extensions()
        .get::<AuthenticatedUser>()
        .cloned()
        .ok_or(AppError::Unauthorized)?;

    let mut conn = pool
        .get()
        .map_err(|e| AppError::DatabaseError(e.to_string()))?;

    let user: super::models::User = users::table
        .filter(users::id.eq(auth_user.user_id))
        .first(&mut conn)?;

    Ok(HttpResponse::Ok().json(user))
}

// #7: Validate email format before updating
pub async fn update_email(
    req: HttpRequest,
    pool: web::Data<DbPool>,
    body: web::Json<UpdateEmailRequest>,
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

    // Best-effort cleanup from Supabase
    supabase.delete_avatar(user.user_id).await.ok();
    supabase.delete_user(user.user_id).await.ok();

    Ok(HttpResponse::NoContent().finish())
}

fn build_refresh_cookie(token: &str, config: &CookieConfig) -> cookie::Cookie<'static> {
    cookie::Cookie::build("refresh_token", token.to_string())
        .path("/")
        .http_only(true)
        .secure(config.secure)
        .same_site(config.same_site)
        .max_age(cookie::time::Duration::days(7))
        .finish()
}
