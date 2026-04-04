DROP INDEX IF EXISTS idx_users_nickname;

ALTER TABLE users
    DROP COLUMN IF EXISTS first_name,
    DROP COLUMN IF EXISTS last_name,
    DROP COLUMN IF EXISTS nickname,
    DROP COLUMN IF EXISTS birth_date,
    DROP COLUMN IF EXISTS profile_type,
    DROP COLUMN IF EXISTS cref_number,
    DROP COLUMN IF EXISTS cref_verified,
    DROP COLUMN IF EXISTS avatar_url,
    DROP COLUMN IF EXISTS social_links;
