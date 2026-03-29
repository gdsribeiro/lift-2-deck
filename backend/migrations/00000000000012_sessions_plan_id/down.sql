ALTER TABLE workout_sessions ADD COLUMN series_id UUID;
ALTER TABLE workout_sessions DROP COLUMN plan_id;
