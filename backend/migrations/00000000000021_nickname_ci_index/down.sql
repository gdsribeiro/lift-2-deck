DROP INDEX IF EXISTS idx_users_nickname_ci;
CREATE UNIQUE INDEX idx_users_nickname ON users(nickname);
