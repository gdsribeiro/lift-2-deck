use reqwest::Client;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::errors::AppError;

#[derive(Clone)]
pub struct SupabaseClient {
    http: Client,
    base_url: String,
    service_key: String,
}

#[derive(Serialize)]
struct SignUpBody {
    email: String,
    password: String,
}

#[derive(Deserialize)]
struct SupabaseUser {
    id: Uuid,
}

#[derive(Deserialize)]
struct SignUpResponse {
    #[serde(alias = "user")]
    user: Option<SupabaseUser>,
    id: Option<Uuid>,
}

#[derive(Serialize)]
struct TokenBody {
    email: String,
    password: String,
}

#[derive(Deserialize)]
struct TokenResponse {
    user: SupabaseUser,
}

impl SupabaseClient {
    pub fn new(base_url: String, service_key: String) -> Self {
        Self {
            http: Client::new(),
            base_url,
            service_key,
        }
    }

    pub async fn sign_up(&self, email: &str, password: &str) -> Result<Uuid, AppError> {
        let response = self
            .http
            .post(format!("{}/auth/v1/signup", self.base_url))
            .header("apikey", &self.service_key)
            .header("Authorization", format!("Bearer {}", self.service_key))
            .json(&SignUpBody {
                email: email.to_string(),
                password: password.to_string(),
            })
            .send()
            .await
            .map_err(|e| {
                eprintln!("Supabase signup request failed: {}", e.without_url());
                AppError::ExternalServiceError("Supabase request failed".to_string())
            })?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            eprintln!("Supabase signup failed ({status}): {body}");
            return Err(AppError::ExternalServiceError(format!(
                "Supabase signup failed with status {status}"
            )));
        }

        let body: SignUpResponse = response
            .json()
            .await
            .map_err(|e| AppError::ExternalServiceError(e.to_string()))?;

        body.user
            .map(|u| u.id)
            .or(body.id)
            .ok_or_else(|| AppError::ExternalServiceError("No user ID in response".to_string()))
    }

    pub async fn sign_in(&self, email: &str, password: &str) -> Result<Uuid, AppError> {
        let response = self
            .http
            .post(format!(
                "{}/auth/v1/token?grant_type=password",
                self.base_url
            ))
            .header("apikey", &self.service_key)
            .json(&TokenBody {
                email: email.to_string(),
                password: password.to_string(),
            })
            .send()
            .await
            .map_err(|e| AppError::ExternalServiceError(e.to_string()))?;

        if !response.status().is_success() {
            return Err(AppError::Unauthorized);
        }

        let body: TokenResponse = response
            .json()
            .await
            .map_err(|e| AppError::ExternalServiceError(e.to_string()))?;

        Ok(body.user.id)
    }

    pub async fn upload_avatar(
        &self,
        user_id: Uuid,
        file_bytes: Vec<u8>,
        content_type: &str,
    ) -> Result<String, AppError> {
        let ext = match content_type {
            "image/jpeg" => "jpg",
            "image/png" => "png",
            "image/webp" => "webp",
            _ => {
                return Err(AppError::BadRequest(
                    "Only JPEG, PNG and WebP images are allowed".to_string(),
                ))
            }
        };

        let path = format!("{}.{}", user_id, ext);

        let response = self
            .http
            .post(format!(
                "{}/storage/v1/object/avatars/{}",
                self.base_url, path
            ))
            .header("apikey", &self.service_key)
            .header("Authorization", format!("Bearer {}", self.service_key))
            .header("Content-Type", content_type)
            .header("x-upsert", "true")
            .body(file_bytes)
            .send()
            .await
            .map_err(|e| AppError::ExternalServiceError(e.to_string()))?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            eprintln!("Supabase avatar upload failed ({status}): {body}");
            return Err(AppError::ExternalServiceError(
                "Failed to upload avatar".to_string(),
            ));
        }

        let public_url = format!(
            "{}/storage/v1/object/public/avatars/{}",
            self.base_url, path
        );
        Ok(public_url)
    }

    pub async fn delete_avatar(&self, user_id: Uuid) -> Result<(), AppError> {
        for ext in ["jpg", "png", "webp"] {
            let path = format!("{}.{}", user_id, ext);
            self.http
                .delete(format!(
                    "{}/storage/v1/object/avatars/{}",
                    self.base_url, path
                ))
                .header("apikey", &self.service_key)
                .header("Authorization", format!("Bearer {}", self.service_key))
                .send()
                .await
                .ok();
        }
        Ok(())
    }

    pub async fn delete_user(&self, user_id: Uuid) -> Result<(), AppError> {
        let response = self
            .http
            .delete(format!(
                "{}/auth/v1/admin/users/{}",
                self.base_url, user_id
            ))
            .header("apikey", &self.service_key)
            .header("Authorization", format!("Bearer {}", self.service_key))
            .send()
            .await
            .map_err(|e| AppError::ExternalServiceError(e.to_string()))?;

        if !response.status().is_success() {
            eprintln!("Supabase delete_user failed ({})", response.status());
            return Err(AppError::ExternalServiceError(
                "Failed to delete Supabase user".to_string(),
            ));
        }

        Ok(())
    }
}
