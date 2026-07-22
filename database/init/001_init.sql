-- =============================================================================
-- Hackathon Analytics — schema (no JSONB event properties — fixed typed columns)
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

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_applications_updated_at ON applications;
CREATE TRIGGER trg_applications_updated_at
    BEFORE UPDATE ON applications
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- -----------------------------------------------------------------------------
-- dashboard_tiles: one row per tile, FK'd to applications (unchanged)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dashboard_tiles (
    id             TEXT        NOT NULL,
    application_id UUID        NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    PRIMARY KEY (id, application_id),
    title          TEXT        NOT NULL,

    x              INT         NOT NULL DEFAULT 0,
    y              INT         NOT NULL DEFAULT 0,
    w              INT         NOT NULL DEFAULT 4,
    h              INT         NOT NULL DEFAULT 4,

    chart_type     TEXT,                 -- 'bar' | 'line' | 'funnel'
    sql_query      TEXT,
    x_key          TEXT,
    y_key          TEXT,

    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tiles_app ON dashboard_tiles (application_id);

DROP TRIGGER IF EXISTS trg_tiles_updated_at ON dashboard_tiles;
CREATE TRIGGER trg_tiles_updated_at
    BEFORE UPDATE ON dashboard_tiles
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- -----------------------------------------------------------------------------
-- events: generic behavioral events — fixed typed columns, NO jsonb properties
--
-- Column groups:
--   identity     -> application_id, name, screen_name
--   flow tracking-> flow_name, step_number, step_name   (multi-step flows: apply, buy/sell, deposit)
--   item tracking-> item_type, item_id, item_label       (what the user clicked/added: a card, a stock...)
--   interaction  -> element_label                        (the button/link text, e.g. "Apply now")
--   context      -> url, visitor_id, session_id, client_ts, received_at
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS events (
    id              BIGSERIAL   PRIMARY KEY,
    application_id  UUID        NOT NULL REFERENCES applications(id) ON DELETE CASCADE,

    -- what kind of event this is
    name            TEXT        NOT NULL CHECK (name IN (
                        'screen_view',
                        'offering_click',    -- clicked a credit card / loan / stock etc.
                        'flow_step',         -- progressed a step in a multi-step flow
                        'flow_abandoned',
                        'flow_completed',
                        'watchlist_add',
                        'watchlist_remove',
                        'form_error',
                        'button_click'
                    )),
    screen_name     TEXT,                   -- e.g. 'homepage', 'credit_cards_listing', 'apply_step_2'

    -- multi-step flow tracking (nullable — only set during a flow)
    flow_name       TEXT,                   -- e.g. 'credit_card_apply', 'loan_apply', 'buy_order', 'sell_order', 'deposit'
    step_number     INT,
    step_name       TEXT,                   -- e.g. 'risk_disclosure', 'income_verification'

    -- what item the user interacted with (nullable — only set for item-related events)
    item_type       TEXT CHECK (item_type IS NULL OR item_type IN (
                        'credit_card', 'debit_card', 'loan', 'investing', 'insurance', 'stock'
                    )),
    item_id         TEXT,                   -- machine id/slug: 'northbank-cash-rewards', 'AAPL'
    item_label      TEXT,                   -- human-readable: 'Northbank Cash Rewards', 'Apple Inc.'

    -- raw interaction label, e.g. the data-track button text: 'Apply now', 'Learn more', 'Buy', 'Sell'
    element_label   TEXT,

    -- context
    url             TEXT,
    visitor_id      TEXT,                   -- nullable: not sent by current tracker.js
    session_id      TEXT,                   -- reserved for client-side session tracking
    client_ts       BIGINT,                 -- epoch ms as sent by tracker.js
    received_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_app_name    ON events (application_id, name);
CREATE INDEX IF NOT EXISTS idx_events_flow        ON events (application_id, flow_name, step_number);
CREATE INDEX IF NOT EXISTS idx_events_item        ON events (item_type, item_id);
CREATE INDEX IF NOT EXISTS idx_events_received_at ON events (received_at);

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