use chrono::{DateTime, NaiveDate, Utc};
use diesel::prelude::*;
use serde::Serialize;
use uuid::Uuid;

use crate::schema::users;

#[derive(Queryable, Selectable, Serialize)]
#[diesel(table_name = users)]
pub struct User {
    pub id: Uuid,
    pub email: String,
    pub created_at: DateTime<Utc>,
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    pub nickname: Option<String>,
    pub birth_date: Option<NaiveDate>,
    pub profile_type: String,
    pub cref_number: Option<String>,
    pub cref_verified: bool,
    pub avatar_url: Option<String>,
    pub avatar_crop: Option<serde_json::Value>,
    pub social_links: serde_json::Value,
}

#[derive(Insertable)]
#[diesel(table_name = users)]
pub struct NewUser {
    pub id: Uuid,
    pub email: String,
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    pub nickname: Option<String>,
    pub birth_date: Option<NaiveDate>,
    pub profile_type: Option<String>,
    pub cref_number: Option<String>,
    pub social_links: Option<serde_json::Value>,
}
