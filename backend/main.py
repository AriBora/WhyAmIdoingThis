import json
import os
import random
import re
from datetime import datetime, timedelta, timezone
from typing import Any, Literal

from dotenv import load_dotenv

load_dotenv()

import google.generativeai as genai
from fastapi import FastAPI, HTTPException, Request
from fastapi.concurrency import run_in_threadpool
from fastapi.encoders import jsonable_encoder
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from db import init_db, insert_event, run_select, get_tiles, upsert_tile, delete_tile
from schema_prompt import SCHEMA_PROMPT

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.0-flash")

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

app = FastAPI(title="Hackathon Analytics Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup() -> None:
    await init_db()


@app.get("/health")
async def health() -> JSONResponse:
    return JSONResponse({"status": "ok"})


# ---------------------------------------------------------------------------
# /collect  — ingest events from tracker.js
# ---------------------------------------------------------------------------


class CollectPayload(BaseModel):
    site_id: str
    name: str
    properties: dict[str, Any] = {}
    ts: int | None = None
    url: str | None = None


@app.post("/collect", status_code=204)
async def collect(request: Request) -> None:
    """
    Raw-body parse instead of automatic model binding because navigator.sendBeacon()
    and no-cors fetch both send Content-Type: text/plain even with a JSON body.
    """
    raw = await request.body()
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    try:
        payload = CollectPayload(**data)
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))

    await insert_event(
        site_id=payload.site_id,
        name=payload.name,
        properties=payload.properties,
        url=payload.url,
        client_ts=payload.ts,
    )


# ---------------------------------------------------------------------------
# /apps/{site_id}/tiles  — dashboard tile CRUD
# ---------------------------------------------------------------------------


class TilePayload(BaseModel):
    id: str
    kind: str = "custom"
    title: str
    x: int = 0
    y: int = 0
    w: int = 4
    h: int = 4
    chart_type: str | None = None
    sql_query: str | None = None
    x_key: str | None = None
    y_key: str | None = None


@app.get("/apps/{site_id}/tiles")
async def list_tiles(site_id: str) -> JSONResponse:
    tiles = await get_tiles(site_id)
    return JSONResponse(jsonable_encoder(tiles))


@app.put("/apps/{site_id}/tiles/{tile_id}", status_code=200)
async def save_tile(site_id: str, tile_id: str, body: TilePayload) -> JSONResponse:
    if body.id != tile_id:
        raise HTTPException(status_code=422, detail="tile_id in path must match body.id")
    try:
        saved = await upsert_tile(site_id, body.model_dump())
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return JSONResponse(jsonable_encoder(saved))


@app.delete("/apps/{site_id}/tiles/{tile_id}", status_code=200)
async def remove_tile(site_id: str, tile_id: str) -> JSONResponse:
    deleted = await delete_tile(site_id, tile_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Tile not found")
    return JSONResponse({"deleted": tile_id})


# ---------------------------------------------------------------------------
# /chat  — Gemini agentic loop with run_sql + render_chart tools
# ---------------------------------------------------------------------------

_TOOLS = [{"function_declarations": [
    {
        "name": "run_sql",
        "description": (
            "Run a single read-only SELECT/WITH query against the database. "
            "Non-SELECT statements are rejected. Use $1,$2,... placeholders for params."
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
        "description": "Render a chart in the chat. Use after run_sql. Pass row data directly.",
        "parameters": {
            "type": "object",
            "properties": {
                "type": {"type": "string", "enum": ["bar", "line", "funnel"]},
                "title": {"type": "string"},
                "xKey": {"type": "string", "description": "Field name for the x-axis / category."},
                "yKey": {"type": "string", "description": "Field name for the numeric value."},
                "data": {
                    "type": "array",
                    "items": {"type": "object"},
                    "description": "Array of row objects with xKey and yKey fields.",
                },
            },
            "required": ["type", "xKey", "yKey", "data"],
        },
    },
]}]


class ClientMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    messages: list[ClientMessage] = []


@app.post("/chat")
async def chat(req: ChatRequest) -> JSONResponse:
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not set")
    if not req.messages:
        raise HTTPException(status_code=400, detail="No messages")

    contents: list[dict[str, Any]] = [
        {"role": "user" if m.role == "user" else "model", "parts": [{"text": m.content}]}
        for m in req.messages
    ]

    model = genai.GenerativeModel(
        model_name=GEMINI_MODEL,
        system_instruction=SCHEMA_PROMPT,
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
                    rows, row_count = await run_select(str(args.get("sql", "")), args.get("params") or [])
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

    return JSONResponse({"text": final_text or "(no response)", "charts": charts})


# ---------------------------------------------------------------------------
# /custom-chart  — AI-generated dashboard tile spec + data
# ---------------------------------------------------------------------------

_SPEC_INSTRUCTIONS = """
You are designing a NEW dashboard tile. Reply with ONLY a compact JSON object, no prose:
{ "title": string, "chartType": "bar"|"line"|"funnel", "xKey": string, "yKey": string, "sql": string }
The SQL must be a single SELECT that returns rows with columns matching xKey and yKey.
Aim for <= 50 rows.
"""


def _mock_data(
    chart_type: Literal["bar", "line", "funnel"], x_key: str, y_key: str, seed: int
) -> list[dict[str, Any]]:
    """Deterministic fallback data (LCG), used when there's no real DB data yet."""
    state = {"s": seed % 4294967296}

    def rand(n: float) -> float:
        state["s"] = (state["s"] * 1664525 + 1013904223) % 4294967296
        return (state["s"] / 4294967296) * n

    def ri(lo: int, hi: int) -> int:
        return int(lo + rand(hi - lo))

    if chart_type == "line":
        today = datetime.now(timezone.utc)
        return [{x_key: (today - timedelta(days=13 - i)).strftime("%m-%d"), y_key: ri(120, 900)} for i in range(14)]

    if chart_type == "funnel":
        cur = ri(1500, 2200)
        rows = []
        for i, label in enumerate(["Start", "Step 2", "Step 3", "Step 4", "Complete"]):
            if i > 0:
                cur = int(cur * (0.55 + rand(0.3)))
            rows.append({x_key: label, y_key: cur})
        return rows

    rows = [{x_key: l, y_key: ri(20, 250)} for l in ["alpha", "beta", "gamma", "delta", "epsilon", "zeta", "eta"]]
    rows.sort(key=lambda r: r[y_key], reverse=True)
    return rows


class CustomChartRequest(BaseModel):
    prompt: str
    sql: str | None = None
    chartType: Literal["bar", "line", "funnel"] | None = None
    xKey: str | None = None
    yKey: str | None = None
    seed: int | None = None


@app.post("/custom-chart")
async def custom_chart(req: CustomChartRequest) -> JSONResponse:
    prompt = req.prompt.strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="Missing prompt")

    seed = req.seed if req.seed is not None else random.randint(0, 10**9)

    # Fast path: caller already has a spec — just refresh the data.
    if req.sql and req.chartType and req.xKey and req.yKey:
        try:
            rows, _ = await run_select(req.sql, [], 500)
            data = jsonable_encoder(rows)
        except Exception:
            data = _mock_data(req.chartType, req.xKey, req.yKey, seed)
        return JSONResponse({"title": prompt, "chartType": req.chartType, "xKey": req.xKey, "yKey": req.yKey, "sql": req.sql, "data": data})

    # Ask Gemini to generate the chart spec.
    spec: dict[str, Any] | None = None
    if GEMINI_API_KEY:
        try:
            model = genai.GenerativeModel(
                model_name=GEMINI_MODEL,
                system_instruction=SCHEMA_PROMPT + _SPEC_INSTRUCTIONS,
            )
            response = await run_in_threadpool(model.generate_content, prompt)
            text = "".join(getattr(p, "text", "") or "" for p in response.candidates[0].content.parts)
            match = re.search(r"\{[\s\S]*\}", text)
            if match:
                parsed = json.loads(match.group(0))
                chart_type = parsed.get("chartType") if parsed.get("chartType") in ("line", "funnel") else "bar"
                spec = {
                    "title": str(parsed.get("title") or prompt),
                    "chartType": chart_type,
                    "xKey": str(parsed.get("xKey") or "label"),
                    "yKey": str(parsed.get("yKey") or "value"),
                    "sql": str(parsed["sql"]) if parsed.get("sql") else None,
                }
        except Exception:
            pass  # fall through to heuristic below

    # Heuristic fallback when Gemini is unavailable.
    if spec is None:
        lower = prompt.lower()
        chart_type = "funnel" if "funnel" in lower else "line" if any(k in lower for k in ("over time", "daily", "trend")) else "bar"
        spec = {"title": prompt, "chartType": chart_type, "xKey": "day" if chart_type == "line" else "label", "yKey": "value", "sql": None}

    data = None
    if spec["sql"]:
        try:
            rows, _ = await run_select(spec["sql"], [], 500)
            data = jsonable_encoder(rows) or None
        except Exception:
            pass

    return JSONResponse({**spec, "data": data or _mock_data(spec["chartType"], spec["xKey"], spec["yKey"], seed)})
