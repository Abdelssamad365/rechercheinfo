"""Serialization and Export routes.
Allows saving, listing, loading, downloading, uploading, and deleting index checkpoints.
"""

from fastapi import APIRouter, File, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional
from state import state
from core.storage import (
    save_index_to_disk,
    list_saved_indexes,
    load_index_from_disk,
    import_index_from_json_bytes,
    get_saved_index_file_path,
    delete_saved_index,
    sanitize_checkpoint_name
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


@router.get("/download/{filename}")
def download_index(
    filename: str,
    fmt: str = Query("json", description="Export format: json or pkl")
):
    """Downloads a saved index checkpoint file (.json or .pkl) from disk."""
    resolved = get_saved_index_file_path(filename, fmt=fmt)
    if not resolved:
        raise HTTPException(status_code=404, detail=f"Checkpoint '{filename}' not found on disk.")

    full_path, download_name = resolved
    media_type = "application/octet-stream" if fmt.lower() == "pkl" else "application/json"
    return FileResponse(
        path=full_path,
        media_type=media_type,
        filename=download_name
    )


@router.post("/upload")
async def upload_index_checkpoint(file: UploadFile = File(...)):
    """Uploads an external .json index checkpoint into the local disk registry."""
    fname = file.filename or "uploaded_index.json"
    if not fname.lower().endswith(".json"):
        raise HTTPException(
            status_code=400,
            detail="Only .json index checkpoint files are supported for upload."
        )

    try:
        raw_bytes = await file.read()
        saved = import_index_from_json_bytes(raw_bytes, fname)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to import index file: {exc}")

    return {
        "status": "success",
        "message": f"Imported checkpoint '{saved['name']}' ({saved['vocabulary_size']} terms, {saved['num_documents']} docs).",
        "data": saved
    }


@router.delete("/saved/{filename}")
def remove_saved_index(filename: str):
    """Removes a saved index checkpoint (.json and .pkl) from local disk."""
    clean_name = sanitize_checkpoint_name(filename)
    removed = delete_saved_index(filename)
    if not removed:
        raise HTTPException(status_code=404, detail=f"Checkpoint '{clean_name}' not found.")

    return {
        "status": "success",
        "message": f"Removed checkpoint '{clean_name}' from disk.",
        "deleted": clean_name
    }
