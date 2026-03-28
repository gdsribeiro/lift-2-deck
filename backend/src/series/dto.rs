use serde::Deserialize;
use uuid::Uuid;

#[derive(Deserialize)]
pub struct CreateSeriesRequest {
    pub name: String,
    pub order_index: i32,
}

#[derive(Deserialize)]
pub struct UpdateSeriesRequest {
    pub name: Option<String>,
    pub order_index: Option<i32>,
}

#[derive(Deserialize)]
pub struct ReorderItem {
    pub id: Uuid,
    pub order_index: i32,
}
