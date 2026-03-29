ALTER TABLE workout_sessions ADD COLUMN plan_id UUID REFERENCES training_plans(id) ON DELETE SET NULL;

UPDATE workout_sessions SET plan_id = s.plan_id FROM series s WHERE workout_sessions.series_id = s.id;

ALTER TABLE workout_sessions DROP COLUMN series_id;
