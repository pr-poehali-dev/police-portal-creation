ALTER TABLE sessions ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT NOW();
CREATE INDEX IF NOT EXISTS idx_sessions_last_seen ON sessions(last_seen);
