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

async def _pool_get() -> asyncpg.Pool:
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(DATABASE_URL, min_size=1, max_size=10)
    return _pool

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
    event: Any,
    url: str | None,
    client_ts: int | None,
) -> None:
    pool = await _pool_get()
    app_id: str = await pool.fetchval("SELECT id FROM applications WHERE site_id = $1", site_id)

    await pool.execute(
        """
        INSERT INTO events (
            application_id, name, screen_name, flow_name, step_number, step_name,
            item_type, item_id, item_label, element_label, url, visitor_id,
            session_id, client_ts
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        """,
        app_id,
        name,
        event.screen_name,
        event.flow_name,
        event.step_number,
        event.step_name,
        event.item_type,
        event.item_id,
        event.item_label,
        event.element_label,
        url,
        event.visitor_id,
        event.session_id,
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
