CREATE TABLE exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    series_id UUID NOT NULL REFERENCES series(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    muscle_group TEXT NOT NULL DEFAULT '',
    sets INTEGER NOT NULL DEFAULT 3,
    reps_target TEXT NOT NULL DEFAULT '8-12',
    rest_seconds INTEGER NOT NULL DEFAULT 60,
    notes TEXT,
    order_index INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_exercises_series_id ON exercises(series_id);
