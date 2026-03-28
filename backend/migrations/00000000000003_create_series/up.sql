CREATE TABLE series (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES training_plans(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_series_plan_id ON series(plan_id);
