CREATE TABLE IF NOT EXISTS rate_limit_attempts (
    ip_address VARCHAR(45) NOT NULL,
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    success BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_rate_limit_ip_time ON rate_limit_attempts(ip_address, attempted_at);

CREATE TABLE IF NOT EXISTS rate_limit_blocks (
    ip_address VARCHAR(45) PRIMARY KEY,
    blocked_until TIMESTAMPTZ NOT NULL
);
