use diesel::prelude::*;
use uuid::Uuid;

use crate::errors::AppError;
use crate::schema::training_plans;

use super::models::{NewTrainingPlan, TrainingPlan, UpdateTrainingPlan};

pub fn find_all_by_user(
    conn: &mut PgConnection,
    user_id: Uuid,
) -> Result<Vec<TrainingPlan>, AppError> {
    let plans = training_plans::table
        .filter(training_plans::user_id.eq(user_id))
        .order(training_plans::created_at.desc())
        .load::<TrainingPlan>(conn)?;
    Ok(plans)
}

pub fn find_by_id(
    conn: &mut PgConnection,
    plan_id: Uuid,
    user_id: Uuid,
) -> Result<TrainingPlan, AppError> {
    let plan = training_plans::table
        .filter(training_plans::id.eq(plan_id))
        .filter(training_plans::user_id.eq(user_id))
        .first::<TrainingPlan>(conn)?;
    Ok(plan)
}

pub fn create(conn: &mut PgConnection, new_plan: NewTrainingPlan) -> Result<TrainingPlan, AppError> {
    let plan = diesel::insert_into(training_plans::table)
        .values(&new_plan)
        .get_result::<TrainingPlan>(conn)?;
    Ok(plan)
}

pub fn update(
    conn: &mut PgConnection,
    plan_id: Uuid,
    user_id: Uuid,
    changeset: UpdateTrainingPlan,
) -> Result<TrainingPlan, AppError> {
    let plan = diesel::update(
        training_plans::table
            .filter(training_plans::id.eq(plan_id))
            .filter(training_plans::user_id.eq(user_id)),
    )
    .set(&changeset)
    .get_result::<TrainingPlan>(conn)?;
    Ok(plan)
}

pub fn delete(conn: &mut PgConnection, plan_id: Uuid, user_id: Uuid) -> Result<(), AppError> {
    let rows = diesel::delete(
        training_plans::table
            .filter(training_plans::id.eq(plan_id))
            .filter(training_plans::user_id.eq(user_id)),
    )
    .execute(conn)?;

    if rows == 0 {
        return Err(AppError::NotFound("Plan not found".to_string()));
    }
    Ok(())
}
