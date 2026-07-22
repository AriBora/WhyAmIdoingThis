import json
import os
import re
from typing import Any, Sequence

import asyncpg

DATABASE_URL = os.environ.get("DATABASE_URL")

_pool: asyncpg.Pool | None = None

# Read-only guard: reject anything that isn't SELECT/WITH before it touches Postgres.
_DISALLOWED_KEYWORDS = re.compile(
    r"\b(insert|update|delete|drop|alter|truncate|grant|revoke|create|copy|call|vacuum|"
    r"execute|do|comment|listen|notify|lock)\b",
    re.IGNORECASE,
)

# These event names carry structured contact/feedback data → also written to `feedback`.
_FEEDBACK_EVENTS = {"contact_submitted", "feedback_submitted", "feedback"}


async def _pool_get() -> asyncpg.Pool:
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(DATABASE_URL, min_size=1, max_size=10)
    return _pool


# async def init_db() -> None:
#     """Safety-net schema creation for local dev (Docker runs 001_init.sql on first boot)."""
#     pool = await _pool_get()
#     await pool.execute("""
#         CREATE EXTENSION IF NOT EXISTS pgcrypto;

#         CREATE TABLE IF NOT EXISTS applications (
#             id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
#             site_id     TEXT        NOT NULL UNIQUE,
#             name        TEXT        NOT NULL,
#             description TEXT,
#             created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
#             updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
#         );

#         CREATE TABLE IF NOT EXISTS dashboard_tiles (
#             id             TEXT        NOT NULL,
#             application_id UUID        NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
#             PRIMARY KEY (id, application_id),
#             kind           TEXT        NOT NULL DEFAULT 'custom',
#             title          TEXT        NOT NULL,
#             x              INT         NOT NULL DEFAULT 0,
#             y              INT         NOT NULL DEFAULT 0,
#             w              INT         NOT NULL DEFAULT 4,
#             h              INT         NOT NULL DEFAULT 4,
#             chart_type     TEXT,
#             sql_query      TEXT,
#             x_key          TEXT,
#             y_key          TEXT,
#             created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
#             updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
#         );

#         CREATE INDEX IF NOT EXISTS idx_tiles_app ON dashboard_tiles (application_id);

#         CREATE TABLE IF NOT EXISTS events (
#             id              BIGSERIAL   PRIMARY KEY,
#             application_id  UUID        NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
#             name            TEXT        NOT NULL,
#             properties      JSONB       NOT NULL DEFAULT '{}'::jsonb,
#             url             TEXT,
#             visitor_id      TEXT,
#             session_id      TEXT,
#             client_ts       BIGINT,
#             received_at     TIMESTAMPTZ NOT NULL DEFAULT now()
#         );

#         CREATE INDEX IF NOT EXISTS idx_events_app_name       ON events (application_id, name);
#         CREATE INDEX IF NOT EXISTS idx_events_received_at    ON events (received_at);
#         CREATE INDEX IF NOT EXISTS idx_events_properties_gin ON events USING GIN (properties);

#         CREATE TABLE IF NOT EXISTS feedback (
#             id              BIGSERIAL   PRIMARY KEY,
#             application_id  UUID        NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
#             name            TEXT        NOT NULL DEFAULT '',
#             email           TEXT        NOT NULL DEFAULT '',
#             topic           TEXT        NOT NULL DEFAULT 'General question',
#             message         TEXT        NOT NULL,
#             page_url        TEXT,
#             received_at     TIMESTAMPTZ NOT NULL DEFAULT now()
#         );

#         CREATE INDEX IF NOT EXISTS idx_feedback_app_time ON feedback (application_id, received_at);
#         CREATE INDEX IF NOT EXISTS idx_feedback_topic    ON feedback (topic);
#     """)

#     await pool.execute("""
#         INSERT INTO applications (site_id, name, description) VALUES
#             ('demo-bank',  'Demo Bank App',  'Retail banking application for end user analytics'),
#             ('demo-trade', 'Demo Trade App', 'Online trading application for end user analytics')
#         ON CONFLICT (site_id) DO NOTHING;
#     """)

#     # Seed sample events if events table is empty
#     event_count = await pool.fetchval("SELECT count(*) FROM events;")
#     if event_count == 0:
#         demo_bank_id = await pool.fetchval("SELECT id FROM applications WHERE site_id = 'demo-bank'")
#         demo_trade_id = await pool.fetchval("SELECT id FROM applications WHERE site_id = 'demo-trade'")

#         sample_events = [
#             (demo_bank_id, 'page_view', json.dumps({"screen_name": "home"}), '/home', 'v_101', 's_01', None),
#             (demo_bank_id, 'session_start', json.dumps({"device": "mobile"}), '/home', 'v_101', 's_01', None),
#             (demo_bank_id, 'screen_view', json.dumps({"screen_name": "loan_start"}), '/loan/start', 'v_101', 's_01', None),
#             (demo_bank_id, 'flow_step', json.dumps({"flow_name": "loan_application", "step_number": 1, "step_name": "personal_info"}), '/loan/start', 'v_101', 's_01', None),
#             (demo_bank_id, 'flow_step', json.dumps({"flow_name": "loan_application", "step_number": 2, "step_name": "income_verification"}), '/loan/income', 'v_101', 's_01', None),
#             (demo_bank_id, 'form_error', json.dumps({"field_name": "income", "screen_name": "loan_step_2", "error": "Invalid format"}), '/loan/income', 'v_101', 's_01', None),
#             (demo_bank_id, 'flow_abandoned', json.dumps({"flow_name": "loan_application", "last_step": 2}), '/loan/income', 'v_101', 's_01', None),
#             (demo_bank_id, 'button_click', json.dumps({"button_id": "submit_loan"}), '/loan/income', 'v_102', 's_02', None),
#             (demo_bank_id, 'flow_completed', json.dumps({"flow_name": "loan_application"}), '/loan/success', 'v_102', 's_02', None),
#             (demo_trade_id, 'page_view', json.dumps({"screen_name": "portfolio"}), '/portfolio', 'v_201', 's_10', None),
#             (demo_trade_id, 'session_start', json.dumps({"device": "desktop"}), '/portfolio', 'v_201', 's_10', None),
#             (demo_trade_id, 'flow_step', json.dumps({"flow_name": "stock_trade", "step_number": 1, "ticker": "AAPL"}), '/trade/buy', 'v_201', 's_10', None),
#             (demo_trade_id, 'flow_completed', json.dumps({"flow_name": "stock_trade", "shares": 10}), '/trade/success', 'v_201', 's_10', None),
#         ]
#         await pool.executemany(
#             """
#             INSERT INTO events (application_id, name, properties, url, visitor_id, session_id, client_ts)
#             VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7)
#             """,
#             sample_events,
#         )

#     # Seed sample feedback if feedback table is empty
#     feedback_count = await pool.fetchval("SELECT count(*) FROM feedback;")
#     if feedback_count == 0:
#         demo_bank_id = await pool.fetchval("SELECT id FROM applications WHERE site_id = 'demo-bank'")
#         demo_trade_id = await pool.fetchval("SELECT id FROM applications WHERE site_id = 'demo-trade'")

#         sample_feedback = [
#             (demo_bank_id, 'Alice Vance', 'alice@example.com', 'Bug', 'Got stuck on step 2 of the loan application.', '/loan/income'),
#             (demo_bank_id, 'Bob Smith', 'bob@example.com', 'Feature request', 'Would love dark mode support on mobile bank dashboard.', '/dashboard'),
#             (demo_bank_id, 'Charlie Brown', 'charlie@example.com', 'Praise', 'Super clean interface and fast response times!', '/home'),
#             (demo_trade_id, 'Dave Miller', 'dave@example.com', 'Report a problem', 'Trade execution latency was high during market open.', '/trade/buy'),
#             (demo_trade_id, 'Eve Taylor', 'eve@example.com', 'Feature request', 'Please add stop-loss orders to the trade form.', '/trade/buy'),
#         ]
#         await pool.executemany(
#             """
#             INSERT INTO feedback (application_id, name, email, topic, message, page_url)
#             VALUES ($1, $2, $3, $4, $5, $6)
#             """,
#             sample_feedback,
#         )


# ---------------------------------------------------------------------------
# Applications
# ---------------------------------------------------------------------------

async def get_applications() -> list[dict[str, Any]]:
    """Return all registered applications."""
    pool = await _pool_get()
    rows = await pool.fetch(
        "SELECT site_id AS id, site_id, name, description FROM applications ORDER BY name"
    )
    return [dict(r) for r in rows]


# ---------------------------------------------------------------------------
# Schema Metadata
# ---------------------------------------------------------------------------

async def get_app_schema(site_id: str) -> dict[str, Any]:
    """Inspect PostgreSQL schema metadata for the given site_id."""
    pool = await _pool_get()
    app_id = await pool.fetchval("SELECT id FROM applications WHERE site_id = $1", site_id)

    if app_id is None:
        raise ValueError(f"No application found for site_id '{site_id}'")
        
    # Events metadata
    event_rows = await pool.fetch("SELECT DISTINCT name FROM events WHERE application_id = $1 ORDER BY name", app_id)
    event_names = [r["name"] for r in event_rows]

    sample_props = []
    try:
        sample_props_rows = await pool.fetch(
            """
            SELECT DISTINCT key
            FROM events, LATERAL jsonb_object_keys(properties) AS key
            WHERE application_id = $1
            LIMIT 20
            """,
            app_id,
        )
        sample_props = [r["key"] for r in sample_props_rows]
    except Exception:
        sample_props = ["screen_name", "flow_name", "step_number", "field_name", "topic"]

    event_count = await pool.fetchval("SELECT count(*) FROM events WHERE application_id = $1", app_id) or 0

    events_columns = [
        {"name": "id", "type": "bigint", "distinct_count": event_count, "sample_values": [1, 2, 3]},
        {"name": "application_id", "type": "uuid", "distinct_count": 1, "sample_values": [str(app_id)]},
        {"name": "name", "type": "text", "description": "event name", "distinct_count": len(event_names), "sample_values": event_names[:5]},
        {"name": "properties", "type": "jsonb", "description": "event specific payload", "sample_values": sample_props[:5]},
        {"name": "url", "type": "text", "sample_values": ["/home", "/loan/start", "/loan/income"]},
        {"name": "visitor_id", "type": "text", "sample_values": ["v_101", "v_102"]},
        {"name": "session_id", "type": "text", "sample_values": ["s_01", "s_02"]},
        {"name": "client_ts", "type": "bigint"},
        {"name": "received_at", "type": "timestamptz"},
    ]

    # Feedback metadata
    topic_rows = await pool.fetch("SELECT DISTINCT topic FROM feedback WHERE application_id = $1 ORDER BY topic", app_id)
    topics = [r["topic"] for r in topic_rows]

    feedback_count = await pool.fetchval("SELECT count(*) FROM feedback WHERE application_id = $1", app_id) or 0

    feedback_columns = [
        {"name": "id", "type": "bigint", "distinct_count": feedback_count, "sample_values": [1, 2]},
        {"name": "application_id", "type": "uuid", "distinct_count": 1, "sample_values": [str(app_id)]},
        {"name": "name", "type": "text", "sample_values": ["Alice Vance", "Bob Smith"]},
        {"name": "topic", "type": "text", "distinct_count": len(topics), "sample_values": topics[:5]},
        {"name": "email", "type": "text", "sample_values": ["alice@example.com", "bob@example.com"]},
        {"name": "page_url", "type": "text", "sample_values": ["/loan/income", "/dashboard"]},
        {"name": "message", "type": "text"},
        {"name": "received_at", "type": "timestamptz"},
    ]

    return {
        "events": {
            "rows_count": event_count,
            "columns": events_columns,
            "event_names": event_names,
            "sample_properties": sample_props,
        },
        "feedback": {
            "columns": feedback_columns,
            "topics": topics,
        },
    }


# ---------------------------------------------------------------------------
# Feedback
# ---------------------------------------------------------------------------

async def get_feedback(
    site_id: str,
    limit: int = 50,
    topic: str | None = None,
    search: str | None = None,
) -> tuple[list[dict[str, Any]], int]:
    """Fetch real feedback records from PostgreSQL for site_id."""
    pool = await _pool_get()
    app_id = await pool.fetchval("SELECT id FROM applications WHERE site_id = $1", site_id)
    if not app_id:
        return [], 0

    query = """
        SELECT id, name, topic, email, page_url, message, received_at as created_at
        FROM feedback
        WHERE application_id = $1
    """
    params: list[Any] = [app_id]

    if topic:
        params.append(topic)
        query += f" AND topic = ${len(params)}"

    if search:
        params.append(f"%{search}%")
        query += f" AND (name ILIKE ${len(params)} OR email ILIKE ${len(params)} OR message ILIKE ${len(params)})"

    query += " ORDER BY received_at DESC"

    rows = await pool.fetch(query, *params)
    total = len(rows)
    result = [dict(r) for r in rows[:limit]]
    for r in result:
        if r.get("created_at"):
            r["created_at"] = r["created_at"].isoformat()
    return result, total


# ---------------------------------------------------------------------------
# Events
# ---------------------------------------------------------------------------

async def insert_event(
    site_id: str,
    name: str,
    properties: dict[str, Any] | None,
    url: str | None,
    client_ts: int | None,
) -> None:
    props = properties or {}
    pool = await _pool_get()
    app_id: str = await pool.fetchval(
        """
        INSERT INTO applications (site_id, name, description)
        VALUES ($1, $1, 'Auto-registered')
        ON CONFLICT (site_id) DO UPDATE SET site_id = EXCLUDED.site_id
        RETURNING id
        """,
        site_id,
    )

    if name in _FEEDBACK_EVENTS:
        email = str(props.get("email") or "")
        message = str(props.get("message") or "")
        if email and message:
            await pool.execute(
                """
                INSERT INTO feedback (application_id, name, email, topic, message, page_url)
                VALUES ($1, $2, $3, $4, $5, $6)
                """,
                app_id,
                str(props.get("name") or ""),
                email,
                str(props.get("topic") or "General question"),
                message,
                url,
            )

    await pool.execute(
        """
        INSERT INTO events (application_id, name, properties, url, client_ts)
        VALUES ($1, $2, $3::jsonb, $4, $5)
        """,
        app_id,
        name,
        json.dumps(props),
        url,
        client_ts,
    )


# ---------------------------------------------------------------------------
# Dashboard tiles
# ---------------------------------------------------------------------------

async def get_tiles(site_id: str) -> list[dict[str, Any]]:
    """Return all tiles for the given site_id, ordered by (y, x)."""
    pool = await _pool_get()
    rows = await pool.fetch(
        """
        SELECT t.id, t.kind, t.title,
               t.x, t.y, t.w, t.h,
               t.chart_type, t.sql_query, t.x_key, t.y_key,
               t.created_at, t.updated_at
        FROM dashboard_tiles t
        JOIN applications a ON a.id = t.application_id
        WHERE a.site_id = $1
        ORDER BY t.y, t.x
        """,
        site_id,
    )
    return [dict(r) for r in rows]


async def upsert_tile(site_id: str, tile: dict[str, Any]) -> dict[str, Any]:
    """
    Insert or fully replace a tile row. `tile` must contain at minimum `id` and `title`.
    Returns the stored row.
    """
    pool = await _pool_get()
    app_id: str = await pool.fetchval(
        "SELECT id FROM applications WHERE site_id = $1", site_id
    )
    if not app_id:
        app_id = await pool.fetchval(
            """
            INSERT INTO applications (site_id, name, description)
            VALUES ($1, $1, 'Auto-registered')
            ON CONFLICT (site_id) DO UPDATE SET site_id = EXCLUDED.site_id
            RETURNING id
            """,
            site_id,
        )

    row = await pool.fetchrow(
        """
        INSERT INTO dashboard_tiles
            (id, application_id, kind, title, x, y, w, h, chart_type, sql_query, x_key, y_key)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (id, application_id) DO UPDATE SET
            kind       = EXCLUDED.kind,
            title      = EXCLUDED.title,
            x          = EXCLUDED.x,
            y          = EXCLUDED.y,
            w          = EXCLUDED.w,
            h          = EXCLUDED.h,
            chart_type = EXCLUDED.chart_type,
            sql_query  = EXCLUDED.sql_query,
            x_key      = EXCLUDED.x_key,
            y_key      = EXCLUDED.y_key,
            updated_at = now()
        RETURNING id, kind, title, x, y, w, h, chart_type, sql_query, x_key, y_key, created_at, updated_at
        """,
        tile["id"],
        app_id,
        tile.get("kind", "custom"),
        tile["title"],
        tile.get("x", 0),
        tile.get("y", 0),
        tile.get("w", 4),
        tile.get("h", 4),
        tile.get("chart_type"),
        tile.get("sql_query"),
        tile.get("x_key"),
        tile.get("y_key"),
    )
    return dict(row)


async def delete_tile(site_id: str, tile_id: str) -> bool:
    """Delete a tile. Returns True if a row was deleted, False if it didn't exist."""
    pool = await _pool_get()
    result = await pool.execute(
        """
        DELETE FROM dashboard_tiles
        WHERE id = $1
          AND application_id = (SELECT id FROM applications WHERE site_id = $2)
        """,
        tile_id,
        site_id,
    )
    return result == "DELETE 1"


# ---------------------------------------------------------------------------
# Read-only SQL
# ---------------------------------------------------------------------------

async def run_select(
    sql: str, params: Sequence[Any] | None = None, row_limit: int = 500
) -> tuple[list[dict[str, Any]], int]:
    """Run a single read-only SELECT/WITH. Raises ValueError for anything else."""
    stripped = sql.strip().rstrip(";")
    if not stripped:
        raise ValueError("Empty SQL statement.")
    if not re.match(r"^\s*(select|with)\b", stripped, re.IGNORECASE):
        raise ValueError("Only SELECT/WITH statements are allowed.")
    if _DISALLOWED_KEYWORDS.search(stripped):
        raise ValueError("Query contains a disallowed keyword.")
    if ";" in stripped:
        raise ValueError("Only a single statement is allowed (no semicolons).")

    pool = await _pool_get()
    rows = await pool.fetch(stripped, *(params or []))

    result = [dict(r) for r in rows]
    return result[:row_limit], len(result)
