import json
import os
import re
from typing import Any, Sequence

import asyncpg

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://hackathon:hackathon@localhost:5432/hackathon_analytics",
)

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


async def init_db() -> None:
    """Safety-net schema creation for local dev (Docker runs 001_init.sql on first boot)."""
    pool = await _pool_get()
    async with pool.acquire() as conn:
        await conn.execute("""
            CREATE EXTENSION IF NOT EXISTS pgcrypto;

            CREATE TABLE IF NOT EXISTS applications (
                id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
                site_id     TEXT        NOT NULL UNIQUE,
                name        TEXT        NOT NULL,
                description TEXT,
                created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
                updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
            );

            CREATE TABLE IF NOT EXISTS dashboard_tiles (
                id             TEXT        NOT NULL,
                application_id UUID        NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
                PRIMARY KEY (id, application_id),
                kind           TEXT        NOT NULL DEFAULT 'custom',
                title          TEXT        NOT NULL,
                x              INT         NOT NULL DEFAULT 0,
                y              INT         NOT NULL DEFAULT 0,
                w              INT         NOT NULL DEFAULT 4,
                h              INT         NOT NULL DEFAULT 4,
                chart_type     TEXT,
                sql_query      TEXT,
                x_key          TEXT,
                y_key          TEXT,
                created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
                updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
            );

            CREATE INDEX IF NOT EXISTS idx_tiles_app ON dashboard_tiles (application_id);

            CREATE TABLE IF NOT EXISTS events (
                id              BIGSERIAL   PRIMARY KEY,
                application_id  UUID        NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
                name            TEXT        NOT NULL,
                properties      JSONB       NOT NULL DEFAULT '{}'::jsonb,
                url             TEXT,
                visitor_id      TEXT,
                session_id      TEXT,
                client_ts       BIGINT,
                received_at     TIMESTAMPTZ NOT NULL DEFAULT now()
            );

            CREATE INDEX IF NOT EXISTS idx_events_app_name       ON events (application_id, name);
            CREATE INDEX IF NOT EXISTS idx_events_received_at    ON events (received_at);
            CREATE INDEX IF NOT EXISTS idx_events_properties_gin ON events USING GIN (properties);

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
        """)
        await conn.execute("""
            INSERT INTO applications (site_id, name, description) VALUES
                ('demo-bank',  'Demo Bank App',  'Mock banking app for the End User Analytics track'),
                ('demo-trade', 'Demo Trade App', 'Mock trading app for the End User Analytics track')
            ON CONFLICT (site_id) DO NOTHING;
        """)


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
    async with pool.acquire() as conn:
        # Upsert the app row and get its UUID in one shot.
        app_id: str = await conn.fetchval(
            """
            INSERT INTO applications (site_id, name, description)
            VALUES ($1, $1, 'Auto-registered')
            ON CONFLICT (site_id) DO UPDATE SET site_id = EXCLUDED.site_id
            RETURNING id
            """,
            site_id,
        )

        # Structured feedback → also written to the dedicated feedback table.
        if name in _FEEDBACK_EVENTS:
            email = str(props.get("email") or "")
            message = str(props.get("message") or "")
            if email and message:
                await conn.execute(
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

        # Every event always lands in events (full audit trail).
        await conn.execute(
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
    async with pool.acquire() as conn:
        rows = await conn.fetch(
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
    async with pool.acquire() as conn:
        app_id: str = await conn.fetchval(
            "SELECT id FROM applications WHERE site_id = $1", site_id
        )
        if not app_id:
            raise ValueError(f"Unknown site_id: {site_id!r}")

        row = await conn.fetchrow(
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
    async with pool.acquire() as conn:
        result = await conn.execute(
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
# Read-only SQL (used by /chat and /custom-chart)
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
    async with pool.acquire() as conn:
        rows = await conn.fetch(stripped, *(params or []))

    result = [dict(r) for r in rows]
    return result[:row_limit], len(result)
