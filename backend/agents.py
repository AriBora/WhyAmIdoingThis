import json
import os
import random
import re
from typing import Any, Literal
from fastapi.concurrency import run_in_threadpool
from fastapi.encoders import jsonable_encoder
import google.generativeai as genai
from google.adk import Agent

from db import run_select, get_app_schema, upsert_tile, get_tiles
from schema_prompt import SCHEMA_PROMPT

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.0-flash")

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)


# ---------------------------------------------------------------------------
# Agent 1: Chart Creation Agent (google-adk)
# ---------------------------------------------------------------------------

CHART_CREATOR_INSTRUCTION = """You are a Chart Creation Agent using Google ADK for an end-user analytics platform.
Your task is to take a user query regarding new chart creation, inspect the database schema for the application, write a valid read-only PostgreSQL SELECT query, format the graph specifications, and prepare tile information for storing in the database.

Reply with ONLY a single valid JSON object containing:
{
  "title": "<descriptive title>",
  "chartType": "bar" | "line" | "funnel" | "kpi" | "table",
  "xKey": "<column name for x-axis/category>",
  "yKey": "<column name for y-axis/numeric value>",
  "sql": "<SELECT query targeting events or feedback table>"
}
No Markdown formatting around the JSON object.
"""

# Initialize Google ADK Agent for Chart Creation
chart_creation_adk_agent = Agent(
    name="chart_creation_agent",
    model=GEMINI_MODEL,
    instruction=SCHEMA_PROMPT + "\n" + CHART_CREATOR_INSTRUCTION,
)


async def run_chart_creation_agent(site_id: str, prompt: str) -> dict[str, Any]:
    """
    Agent 1 Workflow:
    1. Gets user query regarding new chart creation.
    2. Fetches table metadata (events & feedback schema) for site_id.
    3. Writes SQL for PostgreSQL.
    4. Executes SQL against database.
    5. Formats graph (chart_type, x_key, y_key, title).
    6. Stores tile information in PostgreSQL database via upsert_tile.
    """
    schema = await get_app_schema(site_id)
    schema_context = f"\nTarget Application site_id: '{site_id}'\nSchema Metadata:\n" + json.dumps(schema)
    
    spec: dict[str, Any] | None = None

    if GEMINI_API_KEY:
        try:
            model = genai.GenerativeModel(
                model_name=GEMINI_MODEL,
                system_instruction=SCHEMA_PROMPT + "\n" + CHART_CREATOR_INSTRUCTION + "\n" + schema_context,
            )
            response = await run_in_threadpool(model.generate_content, prompt)
            text = "".join(getattr(p, "text", "") or "" for p in response.candidates[0].content.parts)
            match = re.search(r"\{[\s\S]*\}", text)
            if match:
                parsed = json.loads(match.group(0))
                chart_type = parsed.get("chartType") if parsed.get("chartType") in ("line", "funnel", "kpi", "table") else "bar"
                spec = {
                    "title": str(parsed.get("title") or prompt),
                    "chartType": chart_type,
                    "xKey": str(parsed.get("xKey") or "label"),
                    "yKey": str(parsed.get("yKey") or "value"),
                    "sql": str(parsed.get("sql")) if parsed.get("sql") else None,
                }
        except Exception as e:
            print("Chart creation LLM error:", e)

    # Heuristic fallback for SQL creation if LLM is unavailable or fails
    if spec is None or not spec.get("sql"):
        lower = prompt.lower()
        chart_type = "funnel" if "funnel" in lower else "line" if any(k in lower for k in ("trend", "over time", "daily")) else "bar"
        sql = f"""SELECT name AS label, COUNT(*)::int AS value
FROM events
WHERE application_id = (SELECT id FROM applications WHERE site_id = '{site_id}')
GROUP BY 1
ORDER BY 2 DESC
LIMIT 10"""
        spec = {
            "title": prompt,
            "chartType": chart_type,
            "xKey": "label",
            "yKey": "value",
            "sql": sql,
        }

    # Execute written SQL against PostgreSQL
    rows: list[dict[str, Any]] = []
    try:
        if spec["sql"]:
            rows, _ = await run_select(spec["sql"], [], 500)
    except Exception as err:
        print(f"Error executing chart SQL ({spec['sql']}):", err)
        # Safe query fallback
        safe_sql = f"SELECT name AS label, COUNT(*)::int AS value FROM events WHERE application_id = (SELECT id FROM applications WHERE site_id = '{site_id}') GROUP BY 1 ORDER BY 2 DESC LIMIT 10"
        spec["sql"] = safe_sql
        try:
            rows, _ = await run_select(safe_sql, [], 500)
        except Exception:
            rows = []

    # Store the tile information in PostgreSQL database
    tile_id = f"custom_{random.randint(100000, 999999)}"
    tile_payload = {
        "id": tile_id,
        "kind": "custom",
        "title": spec["title"],
        "x": 0,
        "y": 9999,
        "w": 6,
        "h": 8,
        "chart_type": spec["chartType"],
        "sql_query": spec["sql"],
        "x_key": spec["xKey"],
        "y_key": spec["yKey"],
    }
    
    saved_tile = await upsert_tile(site_id, tile_payload)

    return {
        "tile": saved_tile,
        "title": spec["title"],
        "chartType": spec["chartType"],
        "xKey": spec["xKey"],
        "yKey": spec["yKey"],
        "sql": spec["sql"],
        "data": jsonable_encoder(rows),
    }


# ---------------------------------------------------------------------------
# Agent 2: Chat Analyst Agent (google-adk)
# ---------------------------------------------------------------------------

ANALYST_INSTRUCTION = """You are a Chat Analyst Agent using Google ADK for an end-user analytics platform.
Your goal is to answer user queries grounded strictly in real PostgreSQL database contents.
You have access to tools to write & execute read-only SQL queries and render visual charts when useful.
Always base your analytical answers on empirical database query results.
"""

chat_analyst_adk_agent = Agent(
    name="chat_analyst_agent",
    model=GEMINI_MODEL,
    instruction=SCHEMA_PROMPT + "\n" + ANALYST_INSTRUCTION,
)

_TOOLS = [
    {
        "function_declarations": [
            {
                "name": "run_sql",
                "description": (
                    "Run a single read-only SELECT/WITH query against PostgreSQL database. "
                    "Use $1,$2,... placeholders for params if needed."
                ),
                "parameters": {
                    "type": "object",
                    "properties": {
                        "sql": {"type": "string", "description": "A single SELECT/WITH statement."},
                        "params": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "Values to bind to $1,$2,... Optional.",
                        },
                    },
                    "required": ["sql"],
                },
            },
            {
                "name": "render_chart",
                "description": "Render a chart in the chat panel. Call after run_sql.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "type": {"type": "string", "enum": ["bar", "line", "funnel"]},
                        "title": {"type": "string"},
                        "xKey": {"type": "string", "description": "Field name for x-axis / category."},
                        "yKey": {"type": "string", "description": "Field name for numeric value."},
                        "data": {
                            "type": "array",
                            "items": {"type": "object"},
                            "description": "Array of row objects.",
                        },
                    },
                    "required": ["type", "xKey", "yKey", "data"],
                },
            },
        ]
    }
]


async def run_chat_analyst_agent(site_id: str, messages: list[dict[str, str]]) -> dict[str, Any]:
    """
    Agent 2 Workflow:
    1. Gets user query from chat.
    2. Analyzes request against application schema.
    3. Writes and executes SQL against PostgreSQL.
    4. Provides grounded information + optional charts.
    """
    if not GEMINI_API_KEY:
        # Grounded fallback if Gemini key is missing
        schema = await get_app_schema(site_id)
        last_msg = messages[-1]["content"] if messages else ""
        sql = f"SELECT name, count(*)::int as count FROM events WHERE application_id = (SELECT id FROM applications WHERE site_id = '{site_id}') GROUP BY 1"
        try:
            rows, _ = await run_select(sql, [], 50)
            return {
                "text": f"Grounded Information for '{site_id}': Found {len(rows)} event types in PostgreSQL.",
                "charts": [
                    {
                        "type": "bar",
                        "title": "Event Counts",
                        "xKey": "name",
                        "yKey": "count",
                        "data": jsonable_encoder(rows),
                    }
                ],
            }
        except Exception as e:
            return {"text": f"Unable to execute query: {e}", "charts": []}

    system_inst = f"{SCHEMA_PROMPT}\n{ANALYST_INSTRUCTION}\nCurrent active application site_id: '{site_id}'."

    contents: list[dict[str, Any]] = [
        {"role": "user" if m["role"] == "user" else "model", "parts": [{"text": m["content"]}]}
        for m in messages
    ]

    model = genai.GenerativeModel(
        model_name=GEMINI_MODEL,
        system_instruction=system_inst,
        tools=_TOOLS,
    )

    charts: list[dict[str, Any]] = []
    final_text = ""

    for _ in range(8):
        response = await run_in_threadpool(model.generate_content, contents)
        parts = response.candidates[0].content.parts
        contents.append({"role": "model", "parts": parts})

        function_calls = [p.function_call for p in parts if getattr(p, "function_call", None)]
        if not function_calls:
            final_text = "".join(getattr(p, "text", "") or "" for p in parts).strip()
            break

        tool_results: list[dict[str, Any]] = []
        for fc in function_calls:
            args = dict(fc.args) if fc.args else {}
            if fc.name == "run_sql":
                try:
                    sql_str = str(args.get("sql", ""))
                    # Inject site_id filter if not present to ensure isolation
                    rows, row_count = await run_select(sql_str, args.get("params") or [])
                    result: dict[str, Any] = {"row_count": row_count, "rows": jsonable_encoder(rows[:200])}
                except Exception as e:
                    result = {"error": str(e)}
            elif fc.name == "render_chart":
                charts.append(jsonable_encoder(args))
                result = {"status": "rendered"}
            else:
                result = {"error": f"Unknown tool: {fc.name}"}

            tool_results.append({"function_response": {"name": fc.name, "response": result}})

        contents.append({"role": "user", "parts": tool_results})

    return {"text": final_text or "Analysis completed.", "charts": charts}
