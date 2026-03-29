CREATE TABLE cardio_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity TEXT NOT NULL,
    duration_min INTEGER NOT NULL,
    distance_km NUMERIC(8,2),
    pace_min_km NUMERIC(8,2),
    logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT
);
