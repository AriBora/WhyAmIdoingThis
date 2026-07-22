import json
import os
import random
import re
from typing import Any, Literal

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, HTTPException, Request, Query
from fastapi.encoders import jsonable_encoder
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from db import (
    insert_event,
    run_select,
    get_tiles,
    upsert_tile,
    delete_tile,
    get_applications,
    get_app_schema,
    get_feedback,
    _pool_get,
)
from agents import run_chart_creation_agent, run_chat_analyst_agent

app = FastAPI(title="Hackathon Analytics Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health() -> JSONResponse:
    return JSONResponse({"status": "ok"})


# ---------------------------------------------------------------------------
# /applications — list applications from PostgreSQL
# ---------------------------------------------------------------------------

@app.get("/applications")
async def list_applications() -> JSONResponse:
    apps = await get_applications()
    return JSONResponse(jsonable_encoder(apps))


# ---------------------------------------------------------------------------
# /applications/{site_id}/schema — table schema & metadata from PostgreSQL
# ---------------------------------------------------------------------------

@app.get("/applications/{site_id}/schema")
async def get_schema(site_id: str) -> JSONResponse:
    schema = await get_app_schema(site_id)
    return JSONResponse(jsonable_encoder(schema))


# ---------------------------------------------------------------------------
# /collect — ingest behavioral events
# ---------------------------------------------------------------------------

class CollectPayload(BaseModel):
    site_id: str
    name: str
    screen_name: str | None = None
    flow_name: str | None = None
    step_number: int | None = None
    step_name: str | None = None
    item_type: str | None = None
    item_id: str | None = None
    item_label: str | None = None
    element_label: str | None = None
    visitor_id: str | None = None
    session_id: str | None = None
    ts: int | None = None
    url: str | None = None


class FeedbackPayload(BaseModel):
    site_id: str = "demo-bank"
    name: str
    email: str
    topic: str = "General question"
    message: str
    page_url: str | None = None


@app.post("/collect", status_code=204)
async def collect(request: Request) -> None:
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
        event=payload,
        url=payload.url,
        client_ts=payload.ts,
    )


@app.post("/feedback", status_code=204)
async def collect_feedback(payload: FeedbackPayload) -> None:
    pool = await _pool_get()
    app_id: str = await pool.fetchval("SELECT id FROM applications WHERE site_id = $1", payload.site_id)
    await pool.execute(
        """
        INSERT INTO feedback (application_id, name, email, topic, message, page_url)
        VALUES ($1, $2, $3, $4, $5, $6)
        """,
        app_id, payload.name, payload.email, payload.topic, payload.message, payload.page_url,
    )


# ---------------------------------------------------------------------------
# Dashboard Tiles CRUD
# ---------------------------------------------------------------------------

class TilePayload(BaseModel):
    id: str | None = None
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


class PatchTilePayload(BaseModel):
    title: str | None = None
    x: int | None = None
    y: int | None = None
    w: int | None = None
    h: int | None = None
    chart_type: str | None = None
    sql_query: str | None = None
    x_key: str | None = None
    y_key: str | None = None


@app.get("/applications/{site_id}/tiles")
async def list_tiles(site_id: str) -> JSONResponse:
    tiles = await get_tiles(site_id)
    return JSONResponse(jsonable_encoder(tiles))


@app.post("/applications/{site_id}/tiles", status_code=200)
async def create_tile(site_id: str, body: TilePayload) -> JSONResponse:
    tile_dict = body.model_dump()
    if not tile_dict.get("id"):
        tile_dict["id"] = f"custom_{random.randint(100000, 999999)}"
    saved = await upsert_tile(site_id, tile_dict)
    return JSONResponse(jsonable_encoder(saved))


@app.put("/applications/{site_id}/tiles/{tile_id}", status_code=200)
async def save_tile(site_id: str, tile_id: str, body: TilePayload) -> JSONResponse:
    tile_dict = body.model_dump()
    tile_dict["id"] = tile_id
    saved = await upsert_tile(site_id, tile_dict)
    return JSONResponse(jsonable_encoder(saved))


@app.patch("/tiles/{tile_id}")
async def patch_tile(tile_id: str, body: PatchTilePayload) -> JSONResponse:
    pool = await _pool_get()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT application_id, title, x, y, w, h, chart_type, sql_query, x_key, y_key FROM dashboard_tiles WHERE id = $1",
            tile_id,
        )
        if not row:
            return JSONResponse({"id": tile_id})
        d = dict(row)
        site_id = await conn.fetchval("SELECT site_id FROM applications WHERE id = $1", d["application_id"])
        updates = body.model_dump(exclude_none=True)
        d.update(updates)
        d["id"] = tile_id
        saved = await upsert_tile(site_id, d)
        return JSONResponse(jsonable_encoder(saved))


@app.delete("/applications/{site_id}/tiles/{tile_id}")
async def remove_app_tile(site_id: str, tile_id: str) -> JSONResponse:
    deleted = await delete_tile(site_id, tile_id)
    return JSONResponse({"deleted": tile_id, "ok": deleted})


@app.delete("/tiles/{tile_id}")
async def remove_global_tile(tile_id: str) -> JSONResponse:
    pool = await _pool_get()
    async with pool.acquire() as conn:
        await conn.execute("DELETE FROM dashboard_tiles WHERE id = $1", tile_id)
    return JSONResponse({"ok": True})


# ---------------------------------------------------------------------------
# /applications/{site_id}/query — run read-only SQL query on PostgreSQL
# ---------------------------------------------------------------------------

class QueryRequest(BaseModel):
    sql_query: str
    chart_type: str | None = None
    x_key: str | None = None
    y_key: str | None = None


@app.post("/applications/{site_id}/query")
async def run_app_query(site_id: str, req: QueryRequest) -> JSONResponse:
    try:
        rows, _ = await run_select(req.sql_query, [], 500)
        cols = list(rows[0].keys()) if rows else []
        return JSONResponse({"columns": cols, "rows": jsonable_encoder(rows)})
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ---------------------------------------------------------------------------
# /applications/{site_id}/feedback — query feedback from PostgreSQL
# ---------------------------------------------------------------------------

@app.get("/applications/{site_id}/feedback")
async def list_feedback(
    site_id: str,
    limit: int = Query(50),
    topic: str | None = Query(None),
    search: str | None = Query(None),
) -> JSONResponse:
    rows, total = await get_feedback(site_id, limit=limit, topic=topic, search=search)
    return JSONResponse({"rows": jsonable_encoder(rows), "total": total})


# ---------------------------------------------------------------------------
# Agent 1: /custom-chart — Google ADK Chart Creation Agent
# ---------------------------------------------------------------------------

class CustomChartRequest(BaseModel):
    prompt: str
    application_id: str | None = None


@app.post("/applications/{site_id}/custom-chart")
@app.post("/custom-chart")
async def custom_chart(req: CustomChartRequest, site_id: str | None = None) -> JSONResponse:
    prompt = req.prompt.strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="Missing prompt")
    target_site_id = site_id or req.application_id or "demo-bank"
    result = await run_chart_creation_agent(target_site_id, prompt)
    return JSONResponse(result)


# ---------------------------------------------------------------------------
# Agent 2: /chat — Google ADK Grounded Chat Analyst Agent
# ---------------------------------------------------------------------------

class ClientMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    messages: list[ClientMessage] = []
    application_id: str | None = None


@app.post("/applications/{site_id}/chat")
@app.post("/chat")
async def chat_endpoint(req: ChatRequest, site_id: str | None = None) -> JSONResponse:
    target_site_id = site_id or req.application_id or "demo-bank"
    if not req.messages:
        raise HTTPException(status_code=400, detail="No messages provided")
    msgs = [{"role": m.role, "content": m.content} for m in req.messages]
    result = await run_chat_analyst_agent(target_site_id, msgs)
    return JSONResponse(result)
