"""Core from-scratch NLP and Information Retrieval engine."""

from .indexer import ModelIndexData, MultiModelIndex
from .memory_monitor import compute_index_metrics, deep_getsizeof, format_bytes
from .parser import Document, parse_document_file, parse_raw_text, parse_reuters_sgml
from .pipeline import AVAILABLE_STEPS, DEFAULT_STEP_ORDER, DynamicNLPPipeline

__all__ = [
    "AVAILABLE_STEPS",
    "DEFAULT_STEP_ORDER",
    "Document",
    "DynamicNLPPipeline",
    "ModelIndexData",
    "MultiModelIndex",
    "compute_index_metrics",
    "deep_getsizeof",
    "format_bytes",
    "parse_document_file",
    "parse_raw_text",
    "parse_reuters_sgml",
]
