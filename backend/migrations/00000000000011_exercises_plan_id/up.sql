ALTER TABLE exercises ADD COLUMN exercise_type TEXT NOT NULL DEFAULT 'strength';
ALTER TABLE exercises ADD COLUMN plan_id UUID;

UPDATE exercises SET plan_id = s.plan_id FROM series s WHERE exercises.series_id = s.id;
DELETE FROM exercises WHERE plan_id IS NULL;

ALTER TABLE exercises ALTER COLUMN plan_id SET NOT NULL;
ALTER TABLE exercises ADD CONSTRAINT fk_exercises_plan
    FOREIGN KEY (plan_id) REFERENCES training_plans(id) ON DELETE CASCADE;
CREATE INDEX idx_exercises_plan_id ON exercises(plan_id);

ALTER TABLE exercises DROP COLUMN series_id;
