use actix_web::{web, HttpMessage, HttpRequest, HttpResponse};
use diesel::prelude::*;
use diesel::sql_types::{BigInt, Date, Nullable, Text, Uuid as DieselUuid};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::auth::middleware::AuthenticatedUser;
use crate::db::DbPool;
use crate::errors::AppError;

#[derive(Deserialize)]
pub struct EvolutionQuery {
    pub group_by: Option<String>,
    pub exercise_id: Option<Uuid>,
    pub from: Option<String>,
    pub to: Option<String>,
    pub bucket: Option<String>,
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
    let bucket = query.bucket.clone().unwrap_or_else(|| "day".to_string());

    let date_trunc = match bucket.as_str() {
        "week" => "DATE_TRUNC('week', {date_col})::DATE",
        "month" => "DATE_TRUNC('month', {date_col})::DATE",
        _ => "DATE({date_col})",
    };

    // Bind params are always: $1=user_id, $2=exercise_id (nullable), $3=from (nullable), $4=to (nullable)
    // Filters use ($N IS NULL OR col op $N) pattern so unused filters are no-ops.

    let data_points = match group_by.as_str() {
        "frequency" => {
            let date_expr = date_trunc.replace("{date_col}", "ws.started_at");
            let sql = format!(
                "SELECT {date_expr} as date, COUNT(*)::BIGINT as value \
                 FROM workout_sessions ws \
                 WHERE ws.user_id = $1 AND ws.finished_at IS NOT NULL \
                 AND ($2::TIMESTAMPTZ IS NULL OR ws.started_at >= $2::TIMESTAMPTZ) \
                 AND ($3::TIMESTAMPTZ IS NULL OR ws.started_at <= $3::TIMESTAMPTZ) \
                 GROUP BY {date_expr} ORDER BY date ASC"
            );

            diesel::sql_query(&sql)
                .bind::<DieselUuid, _>(user.user_id)
                .bind::<Nullable<Text>, _>(query.from.as_deref())
                .bind::<Nullable<Text>, _>(query.to.as_deref())
                .load::<DataPoint>(&mut conn)?
        }
        "duration" => {
            let date_expr = date_trunc.replace("{date_col}", "sl.logged_at");
            let sql = format!(
                "SELECT {date_expr} as date, \
                 COALESCE(SUM(sl.duration_min), 0)::BIGINT as value \
                 FROM session_logs sl \
                 JOIN workout_sessions ws ON ws.id = sl.session_id \
                 WHERE ws.user_id = $1 AND ws.finished_at IS NOT NULL \
                 AND ($2::UUID IS NULL OR sl.exercise_id = $2) \
                 AND ($3::TIMESTAMPTZ IS NULL OR sl.logged_at >= $3::TIMESTAMPTZ) \
                 AND ($4::TIMESTAMPTZ IS NULL OR sl.logged_at <= $4::TIMESTAMPTZ) \
                 GROUP BY {date_expr} ORDER BY date ASC"
            );

            diesel::sql_query(&sql)
                .bind::<DieselUuid, _>(user.user_id)
                .bind::<Nullable<DieselUuid>, _>(query.exercise_id)
                .bind::<Nullable<Text>, _>(query.from.as_deref())
                .bind::<Nullable<Text>, _>(query.to.as_deref())
                .load::<DataPoint>(&mut conn)?
        }
        "distance" => {
            let date_expr = date_trunc.replace("{date_col}", "sl.logged_at");
            let sql = format!(
                "SELECT {date_expr} as date, \
                 COALESCE(SUM(CAST(sl.distance_km AS BIGINT)), 0)::BIGINT as value \
                 FROM session_logs sl \
                 JOIN workout_sessions ws ON ws.id = sl.session_id \
                 WHERE ws.user_id = $1 AND ws.finished_at IS NOT NULL \
                 AND ($2::UUID IS NULL OR sl.exercise_id = $2) \
                 AND ($3::TIMESTAMPTZ IS NULL OR sl.logged_at >= $3::TIMESTAMPTZ) \
                 AND ($4::TIMESTAMPTZ IS NULL OR sl.logged_at <= $4::TIMESTAMPTZ) \
                 GROUP BY {date_expr} ORDER BY date ASC"
            );

            diesel::sql_query(&sql)
                .bind::<DieselUuid, _>(user.user_id)
                .bind::<Nullable<DieselUuid>, _>(query.exercise_id)
                .bind::<Nullable<Text>, _>(query.from.as_deref())
                .bind::<Nullable<Text>, _>(query.to.as_deref())
                .load::<DataPoint>(&mut conn)?
        }
        _ => {
            // volume = sum of (weight * reps) per bucket
            let date_expr = date_trunc.replace("{date_col}", "sl.logged_at");
            let sql = format!(
                "SELECT {date_expr} as date, \
                 COALESCE(SUM(CAST(sl.weight_kg AS BIGINT) * COALESCE(sl.reps, 1)), 0)::BIGINT as value \
                 FROM session_logs sl \
                 JOIN workout_sessions ws ON ws.id = sl.session_id \
                 WHERE ws.user_id = $1 AND ws.finished_at IS NOT NULL \
                 AND ($2::UUID IS NULL OR sl.exercise_id = $2) \
                 AND ($3::TIMESTAMPTZ IS NULL OR sl.logged_at >= $3::TIMESTAMPTZ) \
                 AND ($4::TIMESTAMPTZ IS NULL OR sl.logged_at <= $4::TIMESTAMPTZ) \
                 GROUP BY {date_expr} ORDER BY date ASC"
            );

            diesel::sql_query(&sql)
                .bind::<DieselUuid, _>(user.user_id)
                .bind::<Nullable<DieselUuid>, _>(query.exercise_id)
                .bind::<Nullable<Text>, _>(query.from.as_deref())
                .bind::<Nullable<Text>, _>(query.to.as_deref())
                .load::<DataPoint>(&mut conn)?
        }
    };

    Ok(HttpResponse::Ok().json(EvolutionResponse {
        data_points,
        group_by,
    }))
}
