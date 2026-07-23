-- Analytics reads must be scoped by backend/db.py's run_select_for_site().
-- The backend sets analytics.application_id inside a transaction before each
-- dashboard or agent query. FORCE prevents the database owner from bypassing
-- these policies accidentally.
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE events FORCE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback FORCE ROW LEVEL SECURITY;

ALTER TABLE dashboard_tiles ADD COLUMN IF NOT EXISTS color INT;
ALTER TABLE dashboard_tiles ADD COLUMN IF NOT EXISTS refresh_seconds INT;

DROP POLICY IF EXISTS events_analytics_read_scope ON events;
CREATE POLICY events_analytics_read_scope ON events
    FOR SELECT
    USING (
        NULLIF(current_setting('analytics.application_id', true), '') IS NULL
        OR application_id = NULLIF(current_setting('analytics.application_id', true), '')::uuid
    );

DROP POLICY IF EXISTS feedback_analytics_read_scope ON feedback;
CREATE POLICY feedback_analytics_read_scope ON feedback
    FOR SELECT
    USING (
        NULLIF(current_setting('analytics.application_id', true), '') IS NULL
        OR application_id = NULLIF(current_setting('analytics.application_id', true), '')::uuid
    );

DROP POLICY IF EXISTS events_backend_insert ON events;
CREATE POLICY events_backend_insert ON events FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS feedback_backend_insert ON feedback;
CREATE POLICY feedback_backend_insert ON feedback FOR INSERT WITH CHECK (true);
