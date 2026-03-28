use chrono::{DateTime, Utc};
use diesel::prelude::*;
use serde::Serialize;
use uuid::Uuid;

use crate::schema::training_plans;

#[derive(Queryable, Selectable, Serialize)]
#[diesel(table_name = training_plans)]
pub struct TrainingPlan {
    pub id: Uuid,
    pub user_id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Insertable)]
#[diesel(table_name = training_plans)]
pub struct NewTrainingPlan {
    pub user_id: Uuid,
    pub name: String,
    pub description: Option<String>,
}

#[derive(AsChangeset)]
#[diesel(table_name = training_plans)]
pub struct UpdateTrainingPlan {
    pub name: Option<String>,
    pub description: Option<Option<String>>,
}
