-- =============================================================================
-- Hackathon Analytics — initial schema
-- Runs automatically the first time the Postgres container starts (empty data dir)
-- because it's mounted into /docker-entrypoint-initdb.d/
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- provides gen_random_uuid()

-- -----------------------------------------------------------------------------
-- applications: one row per tracked client app ("site" in tracker.js terms)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS applications (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id     TEXT        NOT NULL UNIQUE,  -- matches data-site-id in tracker.js
    name        TEXT        NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- keep updated_at current on any row change
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_applications_updated_at ON applications;
CREATE TRIGGER trg_applications_updated_at
    BEFORE UPDATE ON applications
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- -----------------------------------------------------------------------------
-- dashboard_tiles: one row per tile, FK'd to applications
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dashboard_tiles (
    id             TEXT        NOT NULL,
    application_id UUID        NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    PRIMARY KEY (id, application_id),

    kind           TEXT        NOT NULL DEFAULT 'custom',
                                        -- built-in: 'kpi-sessions' | 'kpi-active' | 'kpi-completion'
                                        --           | 'kpi-dropoff' | 'chart-funnel' | 'chart-daily'
                                        --           | 'chart-errors' | 'chat'
                                        -- custom:   'custom'
    title          TEXT        NOT NULL,

    -- react-grid-layout position/size
    x              INT         NOT NULL DEFAULT 0,
    y              INT         NOT NULL DEFAULT 0,
    w              INT         NOT NULL DEFAULT 4,
    h              INT         NOT NULL DEFAULT 4,

    -- visualization config (NULL for KPI / chat tiles)
    chart_type     TEXT,                 -- 'bar' | 'line' | 'funnel'
    sql_query      TEXT,                 -- SELECT that drives the chart
    x_key          TEXT,                 -- column mapped to x-axis / category
    y_key          TEXT,                 -- column mapped to y-axis / value

    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tiles_app ON dashboard_tiles (application_id);

DROP TRIGGER IF EXISTS trg_tiles_updated_at ON dashboard_tiles;
CREATE TRIGGER trg_tiles_updated_at
    BEFORE UPDATE ON dashboard_tiles
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- -----------------------------------------------------------------------------
-- events: generic behavioral events, one row per event, FK'd to applications
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS events (
    id              BIGSERIAL   PRIMARY KEY,
    application_id  UUID        NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    name            TEXT        NOT NULL,   -- 'screen_view' | 'flow_step' | 'form_error' | ...
    properties      JSONB       NOT NULL DEFAULT '{}'::jsonb,
    url             TEXT,
    visitor_id      TEXT,                   -- nullable: not sent by current tracker.js
    session_id      TEXT,                   -- reserved for client-side session tracking
    client_ts       BIGINT,                 -- epoch ms as sent by tracker.js
    received_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_app_name       ON events (application_id, name);
CREATE INDEX IF NOT EXISTS idx_events_received_at    ON events (received_at);
CREATE INDEX IF NOT EXISTS idx_events_properties_gin ON events USING GIN (properties);

-- -----------------------------------------------------------------------------
-- feedback: structured contact/support submissions, kept separate from events
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS feedback (
    id              BIGSERIAL   PRIMARY KEY,
    application_id  UUID        NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    name            TEXT        NOT NULL DEFAULT '',
    email           TEXT        NOT NULL DEFAULT '',
    topic           TEXT        NOT NULL DEFAULT 'General question',
    message         TEXT        NOT NULL,
    page_url        TEXT,
    received_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feedback_app_time ON feedback (application_id, received_at);
CREATE INDEX IF NOT EXISTS idx_feedback_topic    ON feedback (topic);

-- -----------------------------------------------------------------------------
-- Seed demo apps
-- -----------------------------------------------------------------------------
INSERT INTO applications (site_id, name, description) VALUES
    ('demo-bank',  'Demo Bank App',  'Mock banking app for the End User Analytics'),
    ('demo-trade', 'Demo Trade App', 'Mock trading app for the End User Analytics')
ON CONFLICT (site_id) DO NOTHING;
