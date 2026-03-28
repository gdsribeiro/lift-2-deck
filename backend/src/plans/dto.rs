use serde::Deserialize;

#[derive(Deserialize)]
pub struct CreatePlanRequest {
    pub name: String,
    pub description: Option<String>,
}

#[derive(Deserialize)]
pub struct UpdatePlanRequest {
    pub name: Option<String>,
    pub description: Option<String>,
}
