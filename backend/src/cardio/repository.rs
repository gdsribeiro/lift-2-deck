use diesel::prelude::*;
use uuid::Uuid;

use crate::errors::AppError;
use crate::schema::cardio_logs;

use super::models::{CardioLog, NewCardioLog};

pub fn find_all_by_user(conn: &mut PgConnection, user_id: Uuid) -> Result<Vec<CardioLog>, AppError> {
    let logs = cardio_logs::table
        .filter(cardio_logs::user_id.eq(user_id))
        .order(cardio_logs::logged_at.desc())
        .load::<CardioLog>(conn)?;
    Ok(logs)
}

pub fn create(conn: &mut PgConnection, new_log: NewCardioLog) -> Result<CardioLog, AppError> {
    let log = diesel::insert_into(cardio_logs::table)
        .values(&new_log)
        .get_result::<CardioLog>(conn)?;
    Ok(log)
}

pub fn delete(conn: &mut PgConnection, log_id: Uuid, user_id: Uuid) -> Result<(), AppError> {
    let rows = diesel::delete(
        cardio_logs::table
            .filter(cardio_logs::id.eq(log_id))
            .filter(cardio_logs::user_id.eq(user_id)),
    )
    .execute(conn)?;

    if rows == 0 {
        return Err(AppError::NotFound("Cardio log not found".to_string()));
    }
    Ok(())
}
