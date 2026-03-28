use serde::Deserialize;
use uuid::Uuid;

#[derive(Deserialize)]
pub struct CreateExerciseRequest {
    pub name: String,
    pub muscle_group: String,
    pub sets: i32,
    pub reps_target: String,
    pub rest_seconds: i32,
    pub notes: Option<String>,
    pub order_index: i32,
}

#[derive(Deserialize)]
pub struct UpdateExerciseRequest {
    pub name: Option<String>,
    pub muscle_group: Option<String>,
    pub sets: Option<i32>,
    pub reps_target: Option<String>,
    pub rest_seconds: Option<i32>,
    pub notes: Option<String>,
    pub order_index: Option<i32>,
}

#[derive(Deserialize)]
pub struct ReorderItem {
    pub id: Uuid,
    pub order_index: i32,
}
