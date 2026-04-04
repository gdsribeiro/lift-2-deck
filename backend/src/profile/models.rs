use chrono::NaiveDate;
use diesel::prelude::*;

use crate::schema::users;

#[derive(AsChangeset)]
#[diesel(table_name = users)]
pub struct UpdateProfileData {
    pub first_name: Option<String>,
    pub last_name: Option<Option<String>>,
    pub nickname: Option<String>,
    pub birth_date: Option<NaiveDate>,
    pub profile_type: Option<String>,
    pub cref_number: Option<Option<String>>,
    pub avatar_url: Option<Option<String>>,
    pub avatar_crop: Option<Option<serde_json::Value>>,
    pub social_links: Option<serde_json::Value>,
}
