use serde::Deserialize;
use uuid::Uuid;

use crate::errors::AppError;

#[derive(Deserialize)]
pub struct CreateExerciseRequest {
    pub name: String,
    pub muscle_group: String,
    pub exercise_type: Option<String>,
    pub sets: i32,
    pub reps_target: String,
    pub rest_seconds: i32,
    pub notes: Option<String>,
    pub order_index: i32,
}

impl CreateExerciseRequest {
    pub fn validate(&self) -> Result<(), AppError> {
        if self.name.is_empty() || self.name.len() > 200 {
            return Err(AppError::BadRequest("Name must be 1-200 characters".to_string()));
        }
        if self.sets < 1 || self.sets > 100 {
            return Err(AppError::BadRequest("Sets must be between 1 and 100".to_string()));
        }
        if self.rest_seconds < 0 || self.rest_seconds > 600 {
            return Err(AppError::BadRequest("Rest seconds must be between 0 and 600".to_string()));
        }
        Ok(())
    }
}

#[derive(Deserialize)]
pub struct UpdateExerciseRequest {
    pub name: Option<String>,
    pub muscle_group: Option<String>,
    pub exercise_type: Option<String>,
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
