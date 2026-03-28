use diesel::prelude::*;
use uuid::Uuid;

use crate::errors::AppError;
use crate::schema::exercises;

use super::models::{Exercise, NewExercise, UpdateExercise};

pub fn create(conn: &mut PgConnection, new_exercise: NewExercise) -> Result<Exercise, AppError> {
    let exercise = diesel::insert_into(exercises::table)
        .values(&new_exercise)
        .get_result::<Exercise>(conn)?;
    Ok(exercise)
}

pub fn update(
    conn: &mut PgConnection,
    exercise_id: Uuid,
    changeset: UpdateExercise,
) -> Result<Exercise, AppError> {
    let exercise = diesel::update(exercises::table.filter(exercises::id.eq(exercise_id)))
        .set(&changeset)
        .get_result::<Exercise>(conn)?;
    Ok(exercise)
}

pub fn delete(conn: &mut PgConnection, exercise_id: Uuid) -> Result<(), AppError> {
    let rows =
        diesel::delete(exercises::table.filter(exercises::id.eq(exercise_id))).execute(conn)?;
    if rows == 0 {
        return Err(AppError::NotFound("Exercise not found".to_string()));
    }
    Ok(())
}

pub fn reorder(conn: &mut PgConnection, items: &[(Uuid, i32)]) -> Result<(), AppError> {
    for (id, order_index) in items {
        diesel::update(exercises::table.filter(exercises::id.eq(id)))
            .set(exercises::order_index.eq(order_index))
            .execute(conn)?;
    }
    Ok(())
}
