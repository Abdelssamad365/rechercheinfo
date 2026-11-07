"""FastAPI Application Entrypoint — ReutersIR Studio (Phase 1: Admin Module)."""

import os
import sys
from contextlib import asynccontextmanager

# Ensure imports resolve cleanly whether launched from repo root or `backend/`
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api import dataset_router, export_router, index_router, pipeline_router
from state import state


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """Preloads the built-in Reuters-21578 sample dataset on server startup."""
    try:
        docs = state.load_sample_dataset()
        print(f"[Startup] Preloaded {len(docs)} sample Reuters documents.")
    except Exception as exc:
        print(f"[Startup] Could not preload sample dataset: {exc}")
    yield


app = FastAPI(
    title="ReutersIR Studio — Phase 1 Admin API",
    description="From-scratch NLP pipeline, Multi-Model Indexing (BoW, F, TF, TF-IDF), and Deep RAM Profiler.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(dataset_router)
app.include_router(pipeline_router)
app.include_router(index_router)
app.include_router(export_router)


@app.get("/")
def root():
    """Returns basic API service metadata."""
    return {
        "engine": "Reuters-21578 Search Engine Admin API",
        "phase": "Phase 1 - Admin Module",
        "docs_url": "/docs",
        "status": "online",
    }


@app.get("/api/health")
def healthcheck():
    """Returns live readiness and active corpus/index status."""
    return {
        "status": "healthy",
        "dataset_loaded": state.current_dataset_name,
        "num_documents": len(state.documents),
        "has_index": state.current_index is not None,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
