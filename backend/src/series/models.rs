use diesel::prelude::*;
use serde::Serialize;
use uuid::Uuid;

use crate::schema::series;

#[derive(Queryable, Selectable, Serialize)]
#[diesel(table_name = series)]
pub struct Series {
    pub id: Uuid,
    pub plan_id: Uuid,
    pub name: String,
    pub order_index: i32,
}

#[derive(Insertable)]
#[diesel(table_name = series)]
pub struct NewSeries {
    pub plan_id: Uuid,
    pub name: String,
    pub order_index: i32,
}

#[derive(AsChangeset)]
#[diesel(table_name = series)]
pub struct UpdateSeries {
    pub name: Option<String>,
    pub order_index: Option<i32>,
}
