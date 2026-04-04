DROP INDEX IF EXISTS idx_users_nickname;
CREATE UNIQUE INDEX idx_users_nickname_ci ON users(LOWER(nickname));
