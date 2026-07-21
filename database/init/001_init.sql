-- =============================================================================
-- Hackathon Analytics — initial schema
-- Runs automatically the first time the Postgres container starts (empty data dir)
-- because it's mounted into /docker-entrypoint-initdb.d/
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- provides gen_random_uuid()

-- -----------------------------------------------------------------------------
-- applications: one row per tracked client app (a "site" in tracker.js terms)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS applications (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id          TEXT NOT NULL UNIQUE,   -- matches data-site-id attribute in tracker.js
    name             TEXT NOT NULL,
    description      TEXT,

    -- Mirrors DashboardState in dashboard-store.ts (theme, accentHue, tiles, layout).
    -- Currently that state lives in the browser's localStorage; this column lets you
    -- move it server-side later without a schema change — just start reading/writing
    -- this JSON instead of localStorage.
    dashboard_config JSONB NOT NULL DEFAULT '{
        "theme": "light",
        "accentHue": 265,
        "tiles": [
            {"id": "kpi-sessions",   "kind": "kpi-sessions",   "title": "Sessions · last 7d"},
            {"id": "kpi-active",     "kind": "kpi-active",     "title": "Active users now"},
            {"id": "kpi-completion","kind": "kpi-completion", "title": "Loan completion"},
            {"id": "kpi-dropoff",    "kind": "kpi-dropoff",    "title": "Biggest drop-off"},
            {"id": "chart-funnel",  "kind": "chart-funnel",   "title": "Loan application funnel"},
            {"id": "chart-daily",   "kind": "chart-daily",    "title": "Daily sessions"},
            {"id": "chart-errors",  "kind": "chart-errors",   "title": "Top form-error fields"},
            {"id": "chat",          "kind": "chat",           "title": "Ask the analyst"}
        ],
        "layout": [
            {"i": "kpi-sessions",   "x": 0, "y": 0,  "w": 2, "h": 3},
            {"i": "kpi-active",     "x": 2, "y": 0,  "w": 2, "h": 3},
            {"i": "kpi-completion", "x": 4, "y": 0,  "w": 2, "h": 3},
            {"i": "kpi-dropoff",    "x": 6, "y": 0,  "w": 2, "h": 3},
            {"i": "chart-funnel",   "x": 0, "y": 3,  "w": 4, "h": 7},
            {"i": "chart-daily",    "x": 4, "y": 3,  "w": 4, "h": 7},
            {"i": "chart-errors",   "x": 0, "y": 10, "w": 8, "h": 7},
            {"i": "chat",           "x": 8, "y": 0,  "w": 4, "h": 17}
        ]
    }'::jsonb,

    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- keep updated_at fresh whenever a row changes (e.g. dashboard layout saved)
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_applications_updated_at ON applications;
CREATE TRIGGER trg_applications_updated_at
    BEFORE UPDATE ON applications
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- -----------------------------------------------------------------------------
-- events: generic behavioral events, one row per event, FK'd to applications
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS events (
    id              BIGSERIAL PRIMARY KEY,
    application_id  UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,              -- 'page_view', 'flow_step', 'form_error', ...
    properties      JSONB NOT NULL DEFAULT '{}'::jsonb,
    url             TEXT,
    visitor_id      TEXT,                       -- nullable: not sent by the current tracker.js,
    session_id      TEXT,                       -- reserved for when/if you add these client-side
    client_ts       BIGINT,                      -- epoch ms, as sent by tracker.js
    received_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_app_name      ON events (application_id, name);
CREATE INDEX IF NOT EXISTS idx_events_received_at   ON events (received_at);
CREATE INDEX IF NOT EXISTS idx_events_properties_gin ON events USING GIN (properties);

-- -----------------------------------------------------------------------------
-- feedback: structured feedback/support submissions, kept separate from events
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS feedback (
    id              BIGSERIAL PRIMARY KEY,
    application_id  UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    email           TEXT NOT NULL CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    topic           TEXT NOT NULL CHECK (topic IN (
                        'General question',
                        'Credit cards',
                        'Loans',
                        'Investing',
                        'Insurance',
                        'Feedback',
                        'Report a problem'
                    )),
    message         TEXT NOT NULL,
    page_url        TEXT,                        -- where the feedback form was submitted from
    received_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feedback_app_time ON feedback (application_id, received_at);
CREATE INDEX IF NOT EXISTS idx_feedback_topic    ON feedback (topic);

-- -----------------------------------------------------------------------------
-- Seed the demo application row so /collect works out of the box
-- -----------------------------------------------------------------------------
INSERT INTO applications (site_id, name, description)
VALUES ('db-hackathon', 'Deutsche Bank Hackathon Demo App', 'Mock banking app for the End User Analytics track')
ON CONFLICT (site_id) DO NOTHING;
