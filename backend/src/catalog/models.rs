use chrono::{DateTime, Utc};
use diesel::prelude::*;
use serde::Serialize;
use uuid::Uuid;

use crate::schema::catalog_exercises;

#[derive(Queryable, Selectable, Serialize)]
#[diesel(table_name = catalog_exercises)]
pub struct CatalogExercise {
    pub id: Uuid,
    pub user_id: Option<Uuid>,
    pub name: String,
    pub category: String,
    pub exercise_type: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Insertable)]
#[diesel(table_name = catalog_exercises)]
pub struct NewCatalogExercise {
    pub user_id: Uuid,
    pub name: String,
    pub category: String,
    pub exercise_type: String,
}
