use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Deserialize)]
pub struct CreateCatalogRequest {
    pub name: String,
    pub category: String,
    pub exercise_type: Option<String>,
}

#[derive(Deserialize)]
pub struct CatalogQuery {
    pub category: Option<String>,
    pub q: Option<String>,
}

#[derive(Serialize)]
pub struct CatalogResponse {
    pub id: Uuid,
    pub name: String,
    pub category: String,
    pub exercise_type: String,
}
