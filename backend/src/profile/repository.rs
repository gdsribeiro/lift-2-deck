use diesel::prelude::*;
use uuid::Uuid;

use crate::auth::models::User;
use crate::errors::AppError;
use crate::schema::users;

use super::models::UpdateProfileData;

pub fn find_by_user_id(
    conn: &mut PgConnection,
    user_id: Uuid,
) -> Result<User, AppError> {
    let profile = users::table
        .filter(users::id.eq(user_id))
        .first::<User>(conn)?;
    Ok(profile)
}

pub fn update(
    conn: &mut PgConnection,
    user_id: Uuid,
    changeset: UpdateProfileData,
) -> Result<User, AppError> {
    let profile = diesel::update(users::table.filter(users::id.eq(user_id)))
        .set(&changeset)
        .get_result::<User>(conn)?;
    Ok(profile)
}

pub fn is_nickname_taken(
    conn: &mut PgConnection,
    nickname: &str,
) -> Result<bool, AppError> {
    let lower_nick = nickname.to_lowercase();
    let exists: bool = diesel::select(diesel::dsl::exists(
        users::table.filter(diesel::dsl::sql::<diesel::sql_types::Bool>("LOWER(nickname) = ").bind::<diesel::sql_types::Text, _>(&lower_nick)),
    ))
    .get_result(conn)?;
    Ok(exists)
}
