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
