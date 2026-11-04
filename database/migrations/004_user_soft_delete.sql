-- Retain account IDs for orders/audit history while allowing identifiers to be reused.
-- Disabled/Locked accounts still reserve their identifiers until explicitly deleted.
ALTER TABLE users ADD COLUMN deleted_at timestamptz;
ALTER TABLE users ADD CONSTRAINT users_deleted_disabled CHECK (deleted_at IS NULL OR status = 'Disabled');

DROP INDEX users_username_unique;
DROP INDEX users_email_unique;
DROP INDEX users_username_lower_unique;
DROP INDEX users_email_lower_unique;

CREATE UNIQUE INDEX users_username_lower_unique ON users (lower(username)) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX users_email_lower_unique ON users (lower(email)) WHERE deleted_at IS NULL;
