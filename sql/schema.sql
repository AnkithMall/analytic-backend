CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    site_id      VARCHAR(255) NOT NULL,
    event_type   VARCHAR(100) NOT NULL,
    path         TEXT NOT NULL,
    user_id      VARCHAR(255),
    event_time   TIMESTAMPTZ NOT NULL,
    received_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_site_time ON events (site_id, event_time);
CREATE INDEX IF NOT EXISTS idx_events_site_path ON events (site_id, path);
CREATE INDEX IF NOT EXISTS idx_events_site_user ON events (site_id, user_id);
