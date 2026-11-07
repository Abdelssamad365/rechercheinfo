"""Disk serialization and checkpoint management endpoints (`/api/export`)."""

from typing import Optional
from fastapi import APIRouter, File, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel
from core.memory_monitor import compute_index_metrics
from core.storage import (
    delete_saved_index,
    get_saved_index_file_path,
    import_index_from_json_bytes,
    list_saved_indexes,
    load_index_from_disk,
    sanitize_checkpoint_name,
    save_index_to_disk,
)
from state import state


router = APIRouter(prefix="/api/export", tags=["Export"])


class SaveIndexReq(BaseModel):
    name: Optional[str] = "reuters_index"


class LoadIndexReq(BaseModel):
    filename: str


@router.post("/save")
def save_index(req: SaveIndexReq):
    """Serializes the active in-memory index to `.json` and `.pkl` files on disk."""
    if not state.current_index:
        raise HTTPException(status_code=400, detail="No generated index to save.")

    saved = save_index_to_disk(
        index=state.current_index,
        pipeline_steps=state.active_pipeline.step_order,
        name=req.name or "reuters_index",
    )
    return {
        "status": "success",
        "message": f"Successfully serialized index '{saved['name']}' to disk.",
        "data": saved,
    }


@router.get("/saved-list")
def get_saved_indexes():
    """Lists all index checkpoints currently stored in `data/saved_indexes/`."""
    entries = list_saved_indexes()
    return {"count": len(entries), "items": entries}


@router.post("/load")
def load_index(req: LoadIndexReq):
    """Restores a saved checkpoint from disk into active memory."""
    index, meta = load_index_from_disk(req.filename)
    if not index:
        raise HTTPException(status_code=404, detail=f"Checkpoint '{req.filename}' not found.")

    metrics = compute_index_metrics(index)
    state.set_index(index, metrics, execution_time_ms=0.0, total_tokens=0)
    state.current_dataset_name = f"Loaded from {req.filename}"
    state.active_pipeline.step_order = meta.get("pipeline_steps", [])

    return {
        "status": "success",
        "message": f"Successfully loaded index '{req.filename}'.",
        "metadata": meta,
        "metrics": metrics,
    }


@router.get("/download/{filename}")
def download_index(
    filename: str,
    fmt: str = Query("json", description="Download format: json or pkl"),
):
    """Downloads a saved checkpoint file (`.json` or `.pkl`) from disk."""
    resolved = get_saved_index_file_path(filename, fmt=fmt)
    if not resolved:
        raise HTTPException(status_code=404, detail=f"Checkpoint '{filename}' not found on disk.")

    full_path, download_name = resolved
    media_type = "application/octet-stream" if fmt.lower() == "pkl" else "application/json"
    return FileResponse(path=full_path, media_type=media_type, filename=download_name)


@router.post("/upload")
async def upload_index_checkpoint(file: UploadFile = File(...)):
    """Validates and imports an external `.json` checkpoint into local storage."""
    fname = file.filename or "uploaded_index.json"
    if not fname.lower().endswith(".json"):
        raise HTTPException(status_code=400, detail="Only .json checkpoint files are supported.")

    try:
        saved = import_index_from_json_bytes(await file.read(), fname)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to import index file: {exc}") from exc

    return {
        "status": "success",
        "message": (
            f"Imported checkpoint '{saved['name']}' "
            f"({saved['vocabulary_size']} terms, {saved['num_documents']} docs)."
        ),
        "data": saved,
    }


@router.delete("/saved/{filename}")
def remove_saved_index(filename: str):
    """Deletes a saved checkpoint (`.json` and `.pkl`) from disk."""
    clean_name = sanitize_checkpoint_name(filename)
    if not delete_saved_index(filename):
        raise HTTPException(status_code=404, detail=f"Checkpoint '{clean_name}' not found.")

    return {
        "status": "success",
        "message": f"Removed checkpoint '{clean_name}' from disk.",
        "deleted": clean_name,
    }
