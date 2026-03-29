use diesel::prelude::*;
use serde::Serialize;
use uuid::Uuid;

use crate::schema::exercises;

#[derive(Queryable, Selectable, Serialize)]
#[diesel(table_name = exercises)]
pub struct Exercise {
    pub id: Uuid,
    pub name: String,
    pub muscle_group: String,
    pub sets: i32,
    pub reps_target: String,
    pub rest_seconds: i32,
    pub notes: Option<String>,
    pub order_index: i32,
    pub exercise_type: String,
    pub plan_id: Uuid,
}

#[derive(Insertable)]
#[diesel(table_name = exercises)]
pub struct NewExercise {
    pub plan_id: Uuid,
    pub name: String,
    pub muscle_group: String,
    pub sets: i32,
    pub reps_target: String,
    pub rest_seconds: i32,
    pub notes: Option<String>,
    pub order_index: i32,
    pub exercise_type: String,
}

#[derive(AsChangeset)]
#[diesel(table_name = exercises)]
pub struct UpdateExercise {
    pub name: Option<String>,
    pub muscle_group: Option<String>,
    pub sets: Option<i32>,
    pub reps_target: Option<String>,
    pub rest_seconds: Option<i32>,
    pub notes: Option<Option<String>>,
    pub order_index: Option<i32>,
    pub exercise_type: Option<String>,
}
