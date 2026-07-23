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

    screen_rows = await pool.fetch("SELECT DISTINCT screen_name FROM events WHERE application_id = $1 AND screen_name IS NOT NULL ORDER BY screen_name", app_id)
    screen_names = [r["screen_name"] for r in screen_rows]

    flow_rows = await pool.fetch("SELECT DISTINCT flow_name FROM events WHERE application_id = $1 AND flow_name IS NOT NULL ORDER BY flow_name", app_id)
    flow_names = [r["flow_name"] for r in flow_rows]

    item_type_rows = await pool.fetch("SELECT DISTINCT item_type FROM events WHERE application_id = $1 AND item_type IS NOT NULL ORDER BY item_type", app_id)
    item_types = [r["item_type"] for r in item_type_rows]

    element_rows = await pool.fetch("SELECT DISTINCT element_label FROM events WHERE application_id = $1 AND element_label IS NOT NULL ORDER BY element_label", app_id)
    element_labels = [r["element_label"] for r in element_rows]

    event_count = await pool.fetchval("SELECT count(*) FROM events WHERE application_id = $1", app_id) or 0

    events_columns = [
        {"name": "id", "type": "bigint", "description": "primary key", "distinct_count": event_count, "sample_values": [1, 2, 3]},
        {"name": "application_id", "type": "uuid", "description": "FK to applications", "distinct_count": 1, "sample_values": [str(app_id)]},
        {"name": "name", "type": "text", "description": "event name", "distinct_count": len(event_names), "sample_values": event_names[:5]},
        {"name": "screen_name", "type": "text", "description": "screen/page name", "distinct_count": len(screen_names), "sample_values": screen_names[:5]},
        {"name": "flow_name", "type": "text", "description": "multi-step flow name", "distinct_count": len(flow_names), "sample_values": flow_names[:5]},
        {"name": "step_number", "type": "int", "description": "step sequence number", "sample_values": [1, 2, 3]},
        {"name": "step_name", "type": "text", "description": "step label", "sample_values": ["personal_info", "financial_info", "review"]},
        {"name": "item_type", "type": "text", "description": "product/item type", "distinct_count": len(item_types), "sample_values": item_types[:5]},
        {"name": "item_id", "type": "text", "description": "product slug/id", "sample_values": ["cash-rewards", "AAPL"]},
        {"name": "item_label", "type": "text", "description": "product title", "sample_values": ["Cash Rewards", "Apple Inc."]},
        {"name": "element_label", "type": "text", "description": "clicked element/button text", "distinct_count": len(element_labels), "sample_values": element_labels[:5]},
        {"name": "url", "type": "text", "description": "page URL", "sample_values": ["/", "/login", "/dashboard"]},
        {"name": "visitor_id", "type": "text", "description": "visitor / user ID", "sample_values": ["u1", "u2"]},
        {"name": "session_id", "type": "text", "description": "browser session UUID", "sample_values": ["s1", "s2"]},
        {"name": "client_ts", "type": "bigint", "description": "client epoch timestamp ms"},
        {"name": "received_at", "type": "timestamptz", "description": "server timestamp"},
    ]

    # Feedback metadata
    topic_rows = await pool.fetch("SELECT DISTINCT topic FROM feedback WHERE application_id = $1 ORDER BY topic", app_id)
    topics = [r["topic"] for r in topic_rows]

    feedback_count = await pool.fetchval("SELECT count(*) FROM feedback WHERE application_id = $1", app_id) or 0

    feedback_columns = [
        {"name": "id", "type": "bigint", "description": "primary key", "distinct_count": feedback_count, "sample_values": [1, 2]},
        {"name": "application_id", "type": "uuid", "description": "FK to applications", "distinct_count": 1, "sample_values": [str(app_id)]},
        {"name": "name", "type": "text", "description": "submitter name", "sample_values": ["Alice Vance", "Bob Smith"]},
        {"name": "email", "type": "text", "description": "submitter email", "sample_values": ["alice@example.com", "bob@example.com"]},
        {"name": "topic", "type": "text", "description": "feedback category", "distinct_count": len(topics), "sample_values": topics[:5]},
        {"name": "message", "type": "text", "description": "feedback content"},
        {"name": "page_url", "type": "text", "description": "origin page URL", "sample_values": ["/loan/income", "/dashboard"]},
        {"name": "received_at", "type": "timestamptz", "description": "server timestamp"},
    ]

    return {
        "events": {
            "rows_count": event_count,
            "columns": events_columns,
            "event_names": event_names,
            "flow_names": flow_names,
            "screen_names": screen_names,
            "item_types": item_types,
            "sample_properties": ["screen_name", "flow_name", "step_number", "step_name", "item_type", "item_id", "element_label"],
        },
        "feedback": {
            "rows_count": feedback_count,
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

    limit = max(1, min(limit, 200))
    count_query = "SELECT COUNT(*) FROM feedback WHERE application_id = $1"
    count_params: list[Any] = [app_id]
    if topic:
        count_params.append(topic)
        count_query += f" AND topic = ${len(count_params)}"
    if search:
        count_params.append(f"%{search}%")
        count_query += f" AND (name ILIKE ${len(count_params)} OR email ILIKE ${len(count_params)} OR message ILIKE ${len(count_params)})"

    total = await pool.fetchval(count_query, *count_params) or 0
    params.append(limit)
    query += f" LIMIT ${len(params)}"
    result = [dict(r) for r in await pool.fetch(query, *params)]
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
    app_id: str | None = await pool.fetchval("SELECT id FROM applications WHERE site_id = $1", site_id)
    if app_id is None:
        raise ValueError(f"No application found for site_id '{site_id}'")

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

DEFAULT_TILES = [
    {
        "id": "tile_events_by_type",
        "title": "Events by Type",
        "chart_type": "bar",
        "x_key": "label",
        "y_key": "value",
        "x": 0,
        "y": 0,
        "w": 6,
        "h": 6,
        "sql_template": """SELECT name AS label, COUNT(*)::int AS value
FROM events
WHERE application_id = (SELECT id FROM applications WHERE site_id = '{site_id}')
GROUP BY name
ORDER BY value DESC""",
    },
    {
        "id": "tile_screen_views",
        "title": "Screen Views",
        "chart_type": "bar",
        "x_key": "label",
        "y_key": "value",
        "x": 6,
        "y": 0,
        "w": 6,
        "h": 6,
        "sql_template": """SELECT COALESCE(screen_name, 'landing') AS label, COUNT(*)::int AS value
FROM events
WHERE application_id = (SELECT id FROM applications WHERE site_id = '{site_id}')
  AND name = 'screen_view'
GROUP BY screen_name
ORDER BY value DESC""",
    },
    {
        "id": "tile_flow_steps",
        "title": "Flow Step Progress",
        "chart_type": "funnel",
        "x_key": "label",
        "y_key": "value",
        "x": 0,
        "y": 6,
        "w": 6,
        "h": 6,
        "sql_template": """SELECT COALESCE(step_name, 'Step ' || step_number::text) AS label, COUNT(*)::int AS value
FROM events
WHERE application_id = (SELECT id FROM applications WHERE site_id = '{site_id}')
  AND flow_name IS NOT NULL
GROUP BY step_name, step_number
ORDER BY step_number ASC NULLS LAST""",
    },
    {
        "id": "tile_total_visitors",
        "title": "Total Visitors",
        "chart_type": "kpi",
        "x_key": "label",
        "y_key": "value",
        "x": 6,
        "y": 6,
        "w": 3,
        "h": 3,
        "sql_template": """SELECT COUNT(DISTINCT visitor_id)::int AS value
FROM events
WHERE application_id = (SELECT id FROM applications WHERE site_id = '{site_id}')""",
    },
    {
        "id": "tile_form_errors",
        "title": "Form Error Count",
        "chart_type": "kpi",
        "x_key": "label",
        "y_key": "value",
        "x": 9,
        "y": 6,
        "w": 3,
        "h": 3,
        "sql_template": """SELECT COUNT(*)::int AS value
FROM events
WHERE application_id = (SELECT id FROM applications WHERE site_id = '{site_id}')
  AND name = 'form_error'""",
    },
]


async def get_tiles(site_id: str) -> list[dict[str, Any]]:
    """Return all tiles for the given site_id, ordered by (y, x). Seeds defaults if empty."""
    pool = await _pool_get()
    rows = await pool.fetch(
        """
        SELECT t.id, t.title,
               t.x, t.y, t.w, t.h,
               t.chart_type, t.sql_query, t.x_key, t.y_key, t.color, t.refresh_seconds,
               t.created_at, t.updated_at,
               a.site_id AS application_id
        FROM dashboard_tiles t
        JOIN applications a ON a.id = t.application_id
        WHERE a.site_id = $1
        ORDER BY t.y, t.x
        """,
        site_id,
    )
    if not rows:
        # Auto-seed default tiles for this application
        for t in DEFAULT_TILES:
            tile_dict = {
                "id": f"{t['id']}_{site_id}",
                "title": t["title"],
                "chart_type": t["chart_type"],
                "x_key": t["x_key"],
                "y_key": t["y_key"],
                "x": t["x"],
                "y": t["y"],
                "w": t["w"],
                "h": t["h"],
                "sql_query": t["sql_template"].format(site_id=site_id),
            }
            await upsert_tile(site_id, tile_dict)
        rows = await pool.fetch(
            """
            SELECT t.id, t.title,
                   t.x, t.y, t.w, t.h,
                   t.chart_type, t.sql_query, t.x_key, t.y_key, t.color, t.refresh_seconds,
                   t.created_at, t.updated_at,
                   a.site_id AS application_id
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
            (id, application_id, title, x, y, w, h, chart_type, sql_query, x_key, y_key, color, refresh_seconds)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (id, application_id) DO UPDATE SET
            title      = EXCLUDED.title,
            x          = EXCLUDED.x,
            y          = EXCLUDED.y,
            w          = EXCLUDED.w,
            h          = EXCLUDED.h,
            chart_type = EXCLUDED.chart_type,
            sql_query  = EXCLUDED.sql_query,
            x_key      = EXCLUDED.x_key,
            y_key      = EXCLUDED.y_key,
            color      = EXCLUDED.color,
            refresh_seconds = EXCLUDED.refresh_seconds,
            updated_at = now()
        RETURNING id, title, x, y, w, h, chart_type, sql_query, x_key, y_key, color, refresh_seconds, created_at, updated_at
        """,
        tile["id"],
        app_id,
        tile["title"],
        tile.get("x", 0),
        tile.get("y", 0),
        tile.get("w", 4),
        tile.get("h", 4),
        tile.get("chart_type"),
        tile.get("sql_query"),
        tile.get("x_key"),
        tile.get("y_key"),
        tile.get("color"),
        tile.get("refresh_seconds"),
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


async def run_select_for_site(
    site_id: str, sql: str, params: Sequence[Any] | None = None, row_limit: int = 500
) -> tuple[list[dict[str, Any]], int]:
    """Run an analytics query with PostgreSQL row-level app isolation enabled."""
    pool = await _pool_get()
    app_id = await pool.fetchval("SELECT id FROM applications WHERE site_id = $1", site_id)
    if app_id is None:
        raise ValueError(f"No application found for site_id '{site_id}'")

    async with pool.acquire() as conn:
        async with conn.transaction():
            await conn.execute(
                "SELECT set_config('analytics.application_id', $1, true)", str(app_id)
            )
            stripped = sql.strip().rstrip(";")
            if not stripped:
                raise ValueError("Empty SQL statement.")
            if not re.match(r"^\s*(select|with)\b", stripped, re.IGNORECASE):
                raise ValueError("Only SELECT/WITH statements are allowed.")
            if _DISALLOWED_KEYWORDS.search(stripped) or ";" in stripped:
                raise ValueError("Only one read-only SELECT/WITH statement is allowed.")
            rows = await conn.fetch(stripped, *(params or []))
    result = [dict(r) for r in rows]
    return result[:row_limit], len(result)
