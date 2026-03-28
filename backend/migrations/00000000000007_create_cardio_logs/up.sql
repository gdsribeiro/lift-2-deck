CREATE TABLE cardio_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity TEXT NOT NULL,
    duration_min INTEGER NOT NULL,
    distance_km NUMERIC(6,2),
    pace_min_km NUMERIC(5,2),
    logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT
);

CREATE INDEX idx_cardio_logs_user_id ON cardio_logs(user_id, logged_at DESC);
