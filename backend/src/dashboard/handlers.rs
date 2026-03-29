use actix_web::{web, HttpMessage, HttpRequest, HttpResponse};
use chrono::Datelike;
use diesel::prelude::*;
use diesel::sql_types::{BigInt, Date, Uuid as DieselUuid};
use serde::Serialize;

use crate::auth::middleware::AuthenticatedUser;
use crate::db::DbPool;
use crate::errors::AppError;

fn get_user(req: &HttpRequest) -> Result<AuthenticatedUser, AppError> {
    req.extensions()
        .get::<AuthenticatedUser>()
        .cloned()
        .ok_or(AppError::Unauthorized)
}

// ─── GET /dashboard/stats ──────────────────────────────────────────────────

#[derive(Serialize)]
struct DashboardStats {
    days_this_week: i64,
    weekly_volume: i64,
    streak: i64,
}

#[derive(QueryableByName)]
struct CountRow {
    #[diesel(sql_type = BigInt)]
    value: i64,
}

#[derive(QueryableByName)]
struct WeekRow {
    #[diesel(sql_type = Date)]
    week: chrono::NaiveDate,
}

pub async fn get_stats(
    req: HttpRequest,
    pool: web::Data<DbPool>,
) -> Result<HttpResponse, AppError> {
    let user = get_user(&req)?;
    let mut conn = pool.get().map_err(|e| AppError::DatabaseError(e.to_string()))?;

    // Days this week (ISO week)
    let days_this_week: i64 = diesel::sql_query(
        "SELECT COUNT(DISTINCT DATE(ws.started_at))::BIGINT as value \
         FROM workout_sessions ws \
         WHERE ws.user_id = $1 \
           AND ws.finished_at IS NOT NULL \
           AND DATE_TRUNC('week', ws.started_at) = DATE_TRUNC('week', NOW())"
    )
    .bind::<DieselUuid, _>(user.user_id)
    .get_result::<CountRow>(&mut conn)
    .map(|r| r.value)
    .unwrap_or(0);

    // Weekly volume (weight * reps)
    let weekly_volume: i64 = diesel::sql_query(
        "SELECT COALESCE(SUM(CAST(sl.weight_kg AS BIGINT) * COALESCE(sl.reps, 1)), 0)::BIGINT as value \
         FROM session_logs sl \
         JOIN workout_sessions ws ON ws.id = sl.session_id \
         WHERE ws.user_id = $1 \
           AND ws.finished_at IS NOT NULL \
           AND DATE_TRUNC('week', ws.started_at) = DATE_TRUNC('week', NOW())"
    )
    .bind::<DieselUuid, _>(user.user_id)
    .get_result::<CountRow>(&mut conn)
    .map(|r| r.value)
    .unwrap_or(0);

    // Streak: consecutive weeks with at least 1 finished session
    let weeks: Vec<WeekRow> = diesel::sql_query(
        "SELECT DATE_TRUNC('week', ws.started_at)::DATE as week \
         FROM workout_sessions ws \
         WHERE ws.user_id = $1 AND ws.finished_at IS NOT NULL \
         GROUP BY week \
         ORDER BY week DESC"
    )
    .bind::<DieselUuid, _>(user.user_id)
    .load::<WeekRow>(&mut conn)
    .unwrap_or_default();

    let streak = calculate_week_streak(&weeks);

    Ok(HttpResponse::Ok().json(DashboardStats {
        days_this_week,
        weekly_volume,
        streak,
    }))
}

fn calculate_week_streak(weeks: &[WeekRow]) -> i64 {
    if weeks.is_empty() {
        return 0;
    }

    let today = chrono::Utc::now().date_naive();
    let current_week_start = today - chrono::Duration::days(today.weekday().num_days_from_monday() as i64);

    let mut streak: i64 = 0;
    let mut expected_week = current_week_start;

    for w in weeks {
        if w.week == expected_week {
            streak += 1;
            expected_week -= chrono::Duration::weeks(1);
        } else if w.week < expected_week {
            break;
        }
    }

    streak
}

// ─── GET /dashboard/score ──────────────────────────────────────────────────

#[derive(Serialize)]
struct ScoreResult {
    total: i32,
    tier: String,
    label: String,
    color: String,
    breakdown: ScoreBreakdown,
    delta: Option<i32>,
}

#[derive(Serialize)]
struct ScoreBreakdown {
    consistency: f64,
    #[serde(rename = "relativeVolume")]
    relative_volume: f64,
    progression: f64,
    diversity: f64,
    bonus: f64,
}

#[derive(QueryableByName, Default)]
struct WindowData {
    #[diesel(sql_type = BigInt)]
    sessions: i64,
    #[diesel(sql_type = BigInt)]
    total_volume: i64,
    #[diesel(sql_type = BigInt)]
    muscle_groups: i64,
    #[diesel(sql_type = BigInt)]
    has_cardio_30min: i64,
    #[diesel(sql_type = BigInt)]
    had_pr: i64,
}

pub async fn get_score(
    req: HttpRequest,
    pool: web::Data<DbPool>,
) -> Result<HttpResponse, AppError> {
    let user = get_user(&req)?;
    let mut conn = pool.get().map_err(|e| AppError::DatabaseError(e.to_string()))?;

    // Window: last 7 days
    let last_7d = diesel::sql_query(
        "SELECT \
           COUNT(DISTINCT ws.id)::BIGINT as sessions, \
           COALESCE(SUM(CAST(sl.weight_kg AS BIGINT) * COALESCE(sl.reps, 1)), 0)::BIGINT as total_volume, \
           COUNT(DISTINCT sl.exercise_name)::BIGINT as muscle_groups, \
           (CASE WHEN EXISTS( \
               SELECT 1 FROM session_logs s2 \
               JOIN workout_sessions w2 ON w2.id = s2.session_id \
               WHERE w2.user_id = $1 AND w2.finished_at IS NOT NULL \
                 AND s2.logged_at >= NOW() - INTERVAL '7 days' \
                 AND s2.duration_min >= 30 \
           ) THEN 1 ELSE 0 END)::BIGINT as has_cardio_30min, \
           0::BIGINT as had_pr \
         FROM session_logs sl \
         JOIN workout_sessions ws ON ws.id = sl.session_id \
         WHERE ws.user_id = $1 AND ws.finished_at IS NOT NULL \
           AND sl.logged_at >= NOW() - INTERVAL '7 days'"
    )
    .bind::<DieselUuid, _>(user.user_id)
    .get_result::<WindowData>(&mut conn)
    .unwrap_or_default();

    // Window: days 8-30
    let prev_30d = diesel::sql_query(
        "SELECT \
           COUNT(DISTINCT ws.id)::BIGINT as sessions, \
           COALESCE(SUM(CAST(sl.weight_kg AS BIGINT) * COALESCE(sl.reps, 1)), 0)::BIGINT as total_volume, \
           COUNT(DISTINCT sl.exercise_name)::BIGINT as muscle_groups, \
           (CASE WHEN EXISTS( \
               SELECT 1 FROM session_logs s2 \
               JOIN workout_sessions w2 ON w2.id = s2.session_id \
               WHERE w2.user_id = $1 AND w2.finished_at IS NOT NULL \
                 AND s2.logged_at >= NOW() - INTERVAL '30 days' \
                 AND s2.logged_at < NOW() - INTERVAL '7 days' \
                 AND s2.duration_min >= 30 \
           ) THEN 1 ELSE 0 END)::BIGINT as has_cardio_30min, \
           0::BIGINT as had_pr \
         FROM session_logs sl \
         JOIN workout_sessions ws ON ws.id = sl.session_id \
         WHERE ws.user_id = $1 AND ws.finished_at IS NOT NULL \
           AND sl.logged_at >= NOW() - INTERVAL '30 days' \
           AND sl.logged_at < NOW() - INTERVAL '7 days'"
    )
    .bind::<DieselUuid, _>(user.user_id)
    .get_result::<WindowData>(&mut conn)
    .unwrap_or_default();

    // Streak weeks
    let weeks: Vec<WeekRow> = diesel::sql_query(
        "SELECT DATE_TRUNC('week', ws.started_at)::DATE as week \
         FROM workout_sessions ws \
         WHERE ws.user_id = $1 AND ws.finished_at IS NOT NULL \
         GROUP BY week HAVING COUNT(*) >= 2 \
         ORDER BY week DESC"
    )
    .bind::<DieselUuid, _>(user.user_id)
    .load::<WeekRow>(&mut conn)
    .unwrap_or_default();

    let streak_weeks = calculate_week_streak(&weeks);

    let result = calculate_fit_points(&last_7d, &prev_30d, streak_weeks);
    Ok(HttpResponse::Ok().json(result))
}

fn calculate_fit_points(last_7d: &WindowData, prev_30d: &WindowData, streak_weeks: i64) -> ScoreResult {
    const SESSIONS_TARGET: f64 = 4.0;
    const DIVERSITY_TARGET: f64 = 5.0;
    const W7: f64 = 0.7;
    const W30: f64 = 0.3;

    let total_volume_30d = last_7d.total_volume as f64 + prev_30d.total_volume as f64;
    let avg_daily = total_volume_30d / 30.0;
    let ref_volume_7d = avg_daily * 7.0;
    let ref_vol = if ref_volume_7d > 0.0 { ref_volume_7d } else { 1.0 };

    // 7d window scores
    let cons_7d = clamp(last_7d.sessions as f64 / SESSIONS_TARGET, 0.0, 1.0) * 40.0;
    let vol_7d = clamp(last_7d.total_volume as f64 / ref_vol, 0.0, 1.0) * 25.0;
    let div_7d = clamp(last_7d.muscle_groups as f64 / DIVERSITY_TARGET, 0.0, 1.0) * 10.0;

    // 30d window scores
    let cons_30d = clamp(prev_30d.sessions as f64 / SESSIONS_TARGET, 0.0, 1.0) * 40.0;
    let vol_30d = clamp(prev_30d.total_volume as f64 / ref_vol, 0.0, 1.0) * 25.0;
    let div_30d = clamp(prev_30d.muscle_groups as f64 / DIVERSITY_TARGET, 0.0, 1.0) * 10.0;

    // Weighted averages
    let consistency = cons_7d * W7 + cons_30d * W30;
    let relative_volume = vol_7d * W7 + vol_30d * W30;
    let diversity = div_7d * W7 + div_30d * W30;

    // Progression
    let vol_7d_raw = last_7d.total_volume as f64;
    let vol_30d_weekly = (prev_30d.total_volume as f64 / 23.0) * 7.0;
    let delta_pct = if vol_30d_weekly > 0.0 {
        ((vol_7d_raw - vol_30d_weekly) / vol_30d_weekly) * 100.0
    } else {
        0.0
    };
    let progression = clamp(delta_pct / 5.0, -1.0, 1.0) * 7.5 + 7.5;

    // Bonus
    let streak_bonus = if streak_weeks >= 8 { 7.0 }
        else if streak_weeks >= 4 { 5.0 }
        else if streak_weeks >= 2 { 3.0 }
        else { 0.0 };

    let mut milestone_bonus: f64 = 0.0;
    if last_7d.had_pr > 0 { milestone_bonus += 2.0; }
    if last_7d.has_cardio_30min > 0 { milestone_bonus += 1.0; }
    milestone_bonus = milestone_bonus.min(3.0);

    let bonus = (streak_bonus + milestone_bonus).min(10.0);

    let total = clamp(
        (consistency + relative_volume + progression + diversity + bonus).round(),
        0.0,
        100.0,
    ) as i32;

    let (tier, label) = get_tier(total);
    let color = get_tier_color(&tier);

    ScoreResult {
        total,
        tier,
        label,
        color,
        breakdown: ScoreBreakdown {
            consistency: round1(consistency),
            relative_volume: round1(relative_volume),
            progression: round1(progression),
            diversity: round1(diversity),
            bonus: round1(bonus),
        },
        delta: None,
    }
}

fn clamp(val: f64, min: f64, max: f64) -> f64 {
    val.max(min).min(max)
}

fn round1(val: f64) -> f64 {
    (val * 10.0).round() / 10.0
}

fn get_tier(score: i32) -> (String, String) {
    if score >= 85 { ("imparavel".into(), "Imparavel".into()) }
    else if score >= 70 { ("forte".into(), "Forte".into()) }
    else if score >= 50 { ("no-ritmo".into(), "No Ritmo".into()) }
    else if score >= 30 { ("aquecendo".into(), "Aquecendo".into()) }
    else { ("retomando".into(), "Retomando".into()) }
}

fn get_tier_color(tier: &str) -> String {
    match tier {
        "retomando" => "#a8a29e",
        "aquecendo" => "#f97316",
        "no-ritmo" => "#eab308",
        "forte" => "#818cf8",
        "imparavel" => "#22c55e",
        _ => "#a8a29e",
    }.to_string()
}
