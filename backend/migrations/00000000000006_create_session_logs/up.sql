CREATE TABLE session_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
    exercise_id UUID REFERENCES exercises(id) ON DELETE SET NULL,
    exercise_name TEXT NOT NULL,
    set_number INTEGER NOT NULL,
    weight_kg NUMERIC(6,2),
    reps INTEGER,
    logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_session_logs_session ON session_logs(session_id);
CREATE INDEX idx_session_logs_exercise ON session_logs(exercise_id, logged_at DESC);
