use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct SocialLinks {
    pub instagram: Option<String>,
    pub tiktok: Option<String>,
    pub youtube: Option<String>,
    pub strava: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct AvatarCropDto {
    pub zoom: f64,
    pub x: f64,
    pub y: f64,
}

#[derive(Deserialize)]
pub struct UpdateProfileRequest {
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    pub nickname: Option<String>,
    pub birth_date: Option<String>,
    pub profile_type: Option<String>,
    pub cref_number: Option<String>,
    pub social_links: Option<SocialLinks>,
}

#[derive(Deserialize)]
pub struct UpdateAvatarCropRequest {
    pub crop: AvatarCropDto,
}
