DELETE FROM catalog_exercises WHERE user_id IS NULL;
ALTER TABLE catalog_exercises ALTER COLUMN user_id SET NOT NULL;
