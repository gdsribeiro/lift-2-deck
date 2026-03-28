use actix_web::{web, HttpMessage, HttpRequest, HttpResponse};
use diesel::prelude::*;
use diesel::sql_types::{BigInt, Date};
use serde::{Deserialize, Serialize};

use crate::auth::middleware::AuthenticatedUser;
use crate::db::DbPool;
use crate::errors::AppError;

#[derive(Deserialize)]
pub struct EvolutionQuery {
    pub group_by: Option<String>,
    pub from: Option<String>,
    pub to: Option<String>,
}

#[derive(Serialize)]
struct EvolutionResponse {
    data_points: Vec<DataPoint>,
    group_by: String,
}

#[derive(Serialize, QueryableByName)]
struct DataPoint {
    #[diesel(sql_type = Date)]
    date: chrono::NaiveDate,
    #[diesel(sql_type = BigInt)]
    value: i64,
}

fn get_user(req: &HttpRequest) -> Result<AuthenticatedUser, AppError> {
    req.extensions()
        .get::<AuthenticatedUser>()
        .cloned()
        .ok_or(AppError::Unauthorized)
}

pub async fn get_evolution(
    req: HttpRequest,
    pool: web::Data<DbPool>,
    query: web::Query<EvolutionQuery>,
) -> Result<HttpResponse, AppError> {
    let user = get_user(&req)?;
    let mut conn = pool.get().map_err(|e| AppError::DatabaseError(e.to_string()))?;

    let group_by = query.group_by.clone().unwrap_or_else(|| "volume".to_string());

    let data_points = match group_by.as_str() {
        "frequency" => {
            diesel::sql_query(
                "SELECT DATE(ws.started_at) as date, COUNT(*)::BIGINT as value \
                 FROM workout_sessions ws \
                 WHERE ws.user_id = $1 AND ws.finished_at IS NOT NULL \
                 GROUP BY DATE(ws.started_at) \
                 ORDER BY date ASC",
            )
            .bind::<diesel::sql_types::Uuid, _>(user.user_id)
            .load::<DataPoint>(&mut conn)?
        }
        _ => {
            // volume = sum of (weight * reps) per day
            diesel::sql_query(
                "SELECT DATE(sl.logged_at) as date, \
                 COALESCE(SUM(CAST(sl.weight_kg AS BIGINT) * COALESCE(sl.reps, 1)), 0)::BIGINT as value \
                 FROM session_logs sl \
                 JOIN workout_sessions ws ON ws.id = sl.session_id \
                 WHERE ws.user_id = $1 AND ws.finished_at IS NOT NULL \
                 GROUP BY DATE(sl.logged_at) \
                 ORDER BY date ASC",
            )
            .bind::<diesel::sql_types::Uuid, _>(user.user_id)
            .load::<DataPoint>(&mut conn)?
        }
    };

    Ok(HttpResponse::Ok().json(EvolutionResponse {
        data_points,
        group_by,
    }))
}
