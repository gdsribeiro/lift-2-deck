ALTER TABLE users
    ADD COLUMN first_name    TEXT,
    ADD COLUMN last_name     TEXT,
    ADD COLUMN nickname      TEXT UNIQUE,
    ADD COLUMN birth_date    DATE,
    ADD COLUMN profile_type  TEXT NOT NULL DEFAULT 'regular',
    ADD COLUMN cref_number   TEXT,
    ADD COLUMN cref_verified BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN avatar_url    TEXT,
    ADD COLUMN social_links  JSONB NOT NULL DEFAULT '{}';

CREATE INDEX idx_users_nickname ON users(nickname);
