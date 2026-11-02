"""FastAPI Main Application Entrypoint for Reuters Search Engine (Phase 1: Admin Module).
"""

import sys
import os

# Ensure backend directory is in Python path regardless of execution directory
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes_dataset import router as dataset_router
from api.routes_pipeline import router as pipeline_router
from api.routes_index import router as index_router
from api.routes_export import router as export_router
from state import state
from core.parser import parse_document_file


app = FastAPI(
    title="Intelligent Search Engine - Phase 1 Admin Module",
    description="Configurable NLP pipeline, Multi-Model Indexing (BoW, F, TF, TF-IDF), and Deep RAM Monitoring.",
    version="1.0.0"
)

# Enable CORS for local frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register route modules
app.include_router(dataset_router)
app.include_router(pipeline_router)
app.include_router(index_router)
app.include_router(export_router)


@app.on_event("startup")
def preload_sample_data():
    """Automatically loads sample Reuters data on server startup."""
    sample_file = os.path.join(
        os.path.dirname(__file__),
        "data", "samples", "reuters_sample.sgm"
    )
    if os.path.exists(sample_file):
        try:
            with open(sample_file, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
            docs = parse_document_file(content, "reuters_sample.sgm")
            state.set_documents(docs, "Reuters-21578 Sample (20 Documents)")
            print(f"[Startup] Preloaded {len(docs)} sample Reuters documents.")
        except Exception as e:
            print(f"[Startup] Could not preload sample dataset: {e}")


@app.get("/")
def root():
    return {
        "engine": "Reuters-21578 Search Engine Admin API",
        "phase": "Phase 1 - Admin Module",
        "docs_url": "/docs",
        "status": "online"
    }


@app.get("/api/health")
def healthcheck():
    return {
        "status": "healthy",
        "dataset_loaded": state.current_dataset_name,
        "num_documents": len(state.documents),
        "has_index": state.current_index is not None
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
