"""Serialization and Export routes.
Allows saving generated indexes to disk and inspecting saved checkpoints.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from state import state
from core.storage import (
    save_index_to_disk,
    list_saved_indexes,
    load_index_from_disk
)
from core.memory_monitor import compute_index_metrics


router = APIRouter(prefix="/api/export", tags=["Export"])


class SaveIndexReq(BaseModel):
    name: Optional[str] = "reuters_index"


class LoadIndexReq(BaseModel):
    filename: str


@router.post("/save")
def save_index(req: SaveIndexReq):
    """Saves the active index and its configuration to disk."""
    if not state.current_index:
        raise HTTPException(status_code=400, detail="No generated index to save.")

    res = save_index_to_disk(
        index=state.current_index,
        pipeline_steps=state.active_pipeline.step_order,
        name=req.name or "reuters_index"
    )

    return {
        "status": "success",
        "message": f"Successfully serialized index '{res['name']}' to disk.",
        "data": res
    }


@router.get("/saved-list")
def get_saved_indexes():
    """Lists all saved index checkpoints found in data/saved_indexes/."""
    entries = list_saved_indexes()
    return {
        "count": len(entries),
        "items": entries
    }


@router.post("/load")
def load_index(req: LoadIndexReq):
    """Loads a previously saved index into memory for inspection."""
    index, meta = load_index_from_disk(req.filename)
    if not index:
        raise HTTPException(status_code=404, detail=f"Failed to load index '{req.filename}'.")

    state.current_index = index
    state.current_dataset_name = f"Loaded from {req.filename}"
    state.latest_metrics = compute_index_metrics(index)
    state.active_pipeline.step_order = meta.get("pipeline_steps", [])

    return {
        "status": "success",
        "message": f"Successfully loaded index '{req.filename}'.",
        "metadata": meta,
        "metrics": state.latest_metrics
    }

