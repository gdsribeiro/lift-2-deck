ALTER TABLE exercises ADD COLUMN series_id UUID;
ALTER TABLE exercises DROP COLUMN plan_id;
ALTER TABLE exercises DROP COLUMN exercise_type;
