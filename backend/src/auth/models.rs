use chrono::{DateTime, Utc};
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
    #[serde(skip_serializing)]
    pub password_hash: Option<String>,
}

#[derive(Insertable)]
#[diesel(table_name = users)]
pub struct NewUser {
    pub id: Uuid,
    pub email: String,
    pub password_hash: Option<String>,
}
