"""REST API route modules for the Admin Search Engine."""

from .routes_dataset import router as dataset_router
from .routes_export import router as export_router
from .routes_index import router as index_router
from .routes_pipeline import router as pipeline_router

__all__ = [
    "dataset_router",
    "export_router",
    "index_router",
    "pipeline_router",
]

