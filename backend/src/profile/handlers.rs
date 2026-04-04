use actix_multipart::Multipart;
use actix_web::{web, HttpMessage, HttpRequest, HttpResponse};
use chrono::{Datelike, NaiveDate, Utc};
use futures_util::StreamExt;

use crate::auth::middleware::AuthenticatedUser;
use crate::auth::supabase::SupabaseClient;
use crate::db::DbPool;
use crate::errors::AppError;

use super::dto::{SocialLinks, UpdateAvatarCropRequest, UpdateProfileRequest};
use super::models::UpdateProfileData;
use super::repository;

fn get_user(req: &HttpRequest) -> Result<AuthenticatedUser, AppError> {
    req.extensions()
        .get::<AuthenticatedUser>()
        .cloned()
        .ok_or(AppError::Unauthorized)
}

pub async fn get_profile(
    req: HttpRequest,
    pool: web::Data<DbPool>,
) -> Result<HttpResponse, AppError> {
    let user = get_user(&req)?;

    let mut conn = pool
        .get()
        .map_err(|e| AppError::DatabaseError(e.to_string()))?;

    let profile = repository::find_by_user_id(&mut conn, user.user_id)?;
    Ok(HttpResponse::Ok().json(profile))
}

pub async fn update_profile(
    req: HttpRequest,
    pool: web::Data<DbPool>,
    body: web::Json<UpdateProfileRequest>,
) -> Result<HttpResponse, AppError> {
    let user = get_user(&req)?;

    let mut conn = pool
        .get()
        .map_err(|e| AppError::DatabaseError(e.to_string()))?;

    // Validate first_name length
    if let Some(ref name) = body.first_name {
        let trimmed = name.trim();
        if trimmed.is_empty() || trimmed.len() > 100 {
            return Err(AppError::BadRequest(
                "First name must be between 1 and 100 characters".to_string(),
            ));
        }
    }

    // Validate birth_date
    let parsed_birth_date = match &body.birth_date {
        Some(date_str) => {
            let date = NaiveDate::parse_from_str(date_str, "%Y-%m-%d").map_err(|_| {
                AppError::BadRequest("Invalid date format, expected YYYY-MM-DD".to_string())
            })?;
            validate_age(&date)?;
            Some(date)
        }
        None => None,
    };

    // Validate profile_type
    if let Some(ref pt) = body.profile_type {
        if pt != "regular" && pt != "professional" {
            return Err(AppError::BadRequest(
                "Profile type must be 'regular' or 'professional'".to_string(),
            ));
        }
    }

    // Validate nickname
    if let Some(ref nick) = body.nickname {
        let trimmed = nick.trim();
        if trimmed.len() < 3 || trimmed.len() > 40 {
            return Err(AppError::BadRequest(
                "Nickname must be between 3 and 40 characters".to_string(),
            ));
        }
        if repository::is_nickname_taken(&mut conn, trimmed)? {
            let current = repository::find_by_user_id(&mut conn, user.user_id)?;
            if current.nickname.as_deref() != Some(trimmed) {
                return Err(AppError::BadRequest("Nickname already taken".to_string()));
            }
        }
    }

    // Validate CREF if professional
    let cref = match (&body.profile_type, &body.cref_number) {
        (Some(pt), Some(cref)) if pt == "professional" => {
            if !is_valid_cref(cref) {
                return Err(AppError::BadRequest(
                    "Invalid CREF format. Expected: 123456-G/SP".to_string(),
                ));
            }
            Some(Some(cref.clone()))
        }
        (Some(pt), _) if pt == "regular" => Some(None),
        _ => None,
    };

    // Validate social links (FIX-03)
    if let Some(ref sl) = body.social_links {
        validate_social_links(sl)?;
    }

    let social_links = body
        .social_links
        .as_ref()
        .map(|sl| {
            serde_json::to_value(sl).map_err(|e| AppError::InternalError(e.to_string()))
        })
        .transpose()?;

    let changeset = UpdateProfileData {
        first_name: body.first_name.as_ref().map(|n| n.trim().to_string()),
        last_name: body
            .last_name
            .as_ref()
            .map(|n| Some(n.trim().to_string())),
        nickname: body.nickname.as_ref().map(|n| n.trim().to_string()),
        birth_date: parsed_birth_date,
        profile_type: body.profile_type.clone(),
        cref_number: cref,
        avatar_url: None,
        avatar_crop: None,
        social_links,
    };

    let profile = repository::update(&mut conn, user.user_id, changeset)?;
    Ok(HttpResponse::Ok().json(profile))
}

// FIX-01: Dedicated endpoint for avatar crop — validates user has an avatar
pub async fn update_avatar_crop(
    req: HttpRequest,
    pool: web::Data<DbPool>,
    body: web::Json<UpdateAvatarCropRequest>,
) -> Result<HttpResponse, AppError> {
    let user = get_user(&req)?;

    let mut conn = pool
        .get()
        .map_err(|e| AppError::DatabaseError(e.to_string()))?;

    let current = repository::find_by_user_id(&mut conn, user.user_id)?;
    if current.avatar_url.is_none() {
        return Err(AppError::BadRequest(
            "Upload an avatar before setting crop".to_string(),
        ));
    }

    let crop_value =
        serde_json::to_value(&body.crop).map_err(|e| AppError::InternalError(e.to_string()))?;

    let changeset = UpdateProfileData {
        first_name: None,
        last_name: None,
        nickname: None,
        birth_date: None,
        profile_type: None,
        cref_number: None,
        avatar_url: None,
        avatar_crop: Some(Some(crop_value)),
        social_links: None,
    };

    let profile = repository::update(&mut conn, user.user_id, changeset)?;
    Ok(HttpResponse::Ok().json(profile))
}

pub fn validate_age(birth_date: &NaiveDate) -> Result<(), AppError> {
    let today = Utc::now().date_naive();
    let mut age = today.year() - birth_date.year();
    if (today.month(), today.day()) < (birth_date.month(), birth_date.day()) {
        age -= 1;
    }
    if age < 12 {
        return Err(AppError::BadRequest(
            "You must be at least 12 years old".to_string(),
        ));
    }
    Ok(())
}

// FIX-02: Validate magic bytes instead of trusting Content-Type
fn validate_image_magic_bytes(bytes: &[u8]) -> Result<&'static str, AppError> {
    if bytes.len() < 12 {
        return Err(AppError::BadRequest("File too small".to_string()));
    }
    if bytes[0..3] == [0xFF, 0xD8, 0xFF] {
        return Ok("image/jpeg");
    }
    if bytes[0..4] == [0x89, 0x50, 0x4E, 0x47] {
        return Ok("image/png");
    }
    if &bytes[0..4] == b"RIFF" && &bytes[8..12] == b"WEBP" {
        return Ok("image/webp");
    }
    Err(AppError::BadRequest(
        "Invalid image format. Only JPEG, PNG and WebP are allowed".to_string(),
    ))
}

// FIX-03: Sanitize social links
fn validate_social_links(links: &SocialLinks) -> Result<(), AppError> {
    for value in [&links.instagram, &links.tiktok, &links.youtube, &links.strava] {
        if let Some(v) = value {
            if v.len() > 200 {
                return Err(AppError::BadRequest(
                    "Social link must be at most 200 characters".to_string(),
                ));
            }
            let lower = v.to_lowercase();
            if lower.starts_with("javascript:")
                || lower.starts_with("data:")
                || v.contains('<')
                || v.contains('>')
            {
                return Err(AppError::BadRequest(
                    "Invalid characters in social link".to_string(),
                ));
            }
        }
    }
    Ok(())
}

const MAX_AVATAR_SIZE: usize = 2 * 1024 * 1024; // 2 MB

pub async fn upload_avatar(
    req: HttpRequest,
    pool: web::Data<DbPool>,
    supabase: web::Data<SupabaseClient>,
    mut payload: Multipart,
) -> Result<HttpResponse, AppError> {
    let user = get_user(&req)?;

    let mut file_bytes: Vec<u8> = Vec::new();

    while let Some(item) = payload.next().await {
        let mut field = item.map_err(|e| AppError::BadRequest(e.to_string()))?;

        if field.name() == Some("avatar") {
            while let Some(chunk) = field.next().await {
                let data = chunk.map_err(|e| AppError::BadRequest(e.to_string()))?;
                file_bytes.extend_from_slice(&data);
                if file_bytes.len() > MAX_AVATAR_SIZE {
                    return Err(AppError::BadRequest(
                        "Avatar must be smaller than 2 MB".to_string(),
                    ));
                }
            }
        }
    }

    if file_bytes.is_empty() {
        return Err(AppError::BadRequest("No avatar file provided".to_string()));
    }

    // FIX-02: Validate actual file content, ignore client-provided Content-Type
    let content_type = validate_image_magic_bytes(&file_bytes)?;

    let avatar_url = supabase
        .upload_avatar(user.user_id, file_bytes, content_type)
        .await?;

    let mut conn = pool
        .get()
        .map_err(|e| AppError::DatabaseError(e.to_string()))?;

    let changeset = UpdateProfileData {
        first_name: None,
        last_name: None,
        nickname: None,
        birth_date: None,
        profile_type: None,
        cref_number: None,
        avatar_url: Some(Some(avatar_url)),
        avatar_crop: Some(None),
        social_links: None,
    };

    let profile = repository::update(&mut conn, user.user_id, changeset)?;
    Ok(HttpResponse::Ok().json(profile))
}

fn is_valid_cref(cref: &str) -> bool {
    let parts: Vec<&str> = cref.split('/').collect();
    if parts.len() != 2 {
        return false;
    }
    let state = parts[1];
    let left: Vec<&str> = parts[0].split('-').collect();
    if left.len() != 2 {
        return false;
    }
    let digits = left[0];
    let letter = left[1];
    digits.len() == 6
        && digits.chars().all(|c| c.is_ascii_digit())
        && letter.len() == 1
        && letter.chars().all(|c| c.is_ascii_uppercase())
        && state.len() == 2
        && state.chars().all(|c| c.is_ascii_uppercase())
}
