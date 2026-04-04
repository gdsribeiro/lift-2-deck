use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Deserialize)]
pub struct RegisterRequest {
    pub email: String,
    pub password: String,
    pub first_name: String,
    pub last_name: Option<String>,
    pub nickname: Option<String>,
    pub birth_date: String,
    pub profile_type: Option<String>,
    pub cref_number: Option<String>,
    pub social_links: Option<crate::profile::dto::SocialLinks>,
}

#[derive(Serialize)]
pub struct AuthResponse {
    pub access_token: String,
    pub expires_in: u64,
}

#[derive(Deserialize)]
pub struct UpdateEmailRequest {
    pub email: String,
}
