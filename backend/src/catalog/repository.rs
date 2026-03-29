use diesel::prelude::*;
use uuid::Uuid;

use crate::errors::AppError;
use crate::schema::catalog_exercises;

use super::models::{CatalogExercise, NewCatalogExercise};

pub fn find_all(
    conn: &mut PgConnection,
    user_id: Uuid,
    category: Option<&str>,
    q: Option<&str>,
) -> Result<Vec<CatalogExercise>, AppError> {
    let mut query = catalog_exercises::table
        .filter(
            catalog_exercises::user_id.eq(user_id)
                .or(catalog_exercises::user_id.is_null())
        )
        .into_boxed();

    if let Some(cat) = category {
        query = query.filter(catalog_exercises::category.eq(cat));
    }

    if let Some(search) = q {
        let pattern = format!("%{}%", search);
        query = query.filter(catalog_exercises::name.ilike(pattern));
    }

    let items = query
        .order(catalog_exercises::name.asc())
        .load::<CatalogExercise>(conn)?;
    Ok(items)
}

pub fn create(conn: &mut PgConnection, new: NewCatalogExercise) -> Result<CatalogExercise, AppError> {
    let item = diesel::insert_into(catalog_exercises::table)
        .values(&new)
        .get_result::<CatalogExercise>(conn)?;
    Ok(item)
}

pub fn delete(conn: &mut PgConnection, id: Uuid, user_id: Uuid) -> Result<(), AppError> {
    let rows = diesel::delete(
        catalog_exercises::table
            .filter(catalog_exercises::id.eq(id))
            .filter(catalog_exercises::user_id.eq(user_id)),
    )
    .execute(conn)?;

    if rows == 0 {
        return Err(AppError::NotFound("Catalog exercise not found".to_string()));
    }
    Ok(())
}
