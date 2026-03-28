use diesel::prelude::*;
use uuid::Uuid;

use crate::errors::AppError;
use crate::schema::series;

use super::models::{NewSeries, Series, UpdateSeries};

pub fn create(conn: &mut PgConnection, new_series: NewSeries) -> Result<Series, AppError> {
    let s = diesel::insert_into(series::table)
        .values(&new_series)
        .get_result::<Series>(conn)?;
    Ok(s)
}

pub fn update(
    conn: &mut PgConnection,
    series_id: Uuid,
    changeset: UpdateSeries,
) -> Result<Series, AppError> {
    let s = diesel::update(series::table.filter(series::id.eq(series_id)))
        .set(&changeset)
        .get_result::<Series>(conn)?;
    Ok(s)
}

pub fn delete(conn: &mut PgConnection, series_id: Uuid) -> Result<(), AppError> {
    let rows = diesel::delete(series::table.filter(series::id.eq(series_id))).execute(conn)?;
    if rows == 0 {
        return Err(AppError::NotFound("Series not found".to_string()));
    }
    Ok(())
}

pub fn reorder(conn: &mut PgConnection, items: &[(Uuid, i32)]) -> Result<(), AppError> {
    for (id, order_index) in items {
        diesel::update(series::table.filter(series::id.eq(id)))
            .set(series::order_index.eq(order_index))
            .execute(conn)?;
    }
    Ok(())
}
