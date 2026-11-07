"""Deep RAM Profiler and Post-Indexing Metrics Engine.

Measures the true recursive memory footprint of Python index structures
using `sys.getsizeof` with object-ID deduplication, comparing dense matrices
against sparse inverted posting lists.
"""

import sys
from typing import Any, Dict, Optional, Set
from .indexer import MultiModelIndex


def deep_getsizeof(obj: Any, seen: Optional[Set[int]] = None) -> int:
    """Recursively computes the exact byte size of `obj` and its nested elements.

    Tracks visited `id(obj)` references in `seen` so shared objects are counted once.
    """
    if seen is None:
        seen = set()

    obj_id = id(obj)
    if obj_id in seen:
        return 0
    seen.add(obj_id)

    total = sys.getsizeof(obj)

    if isinstance(obj, dict):
        for key, value in obj.items():
            total += deep_getsizeof(key, seen)
            total += deep_getsizeof(value, seen)
    elif isinstance(obj, (list, tuple, set, frozenset)):
        for item in obj:
            total += deep_getsizeof(item, seen)

    return total


def format_bytes(num_bytes: int) -> str:
    """Converts a raw byte count into a human-readable unit (B, KB, MB, GB)."""
    if num_bytes < 1024:
        return f"{num_bytes} B"
    if num_bytes < 1024 ** 2:
        return f"{num_bytes / 1024:.2f} KB"
    if num_bytes < 1024 ** 3:
        return f"{num_bytes / (1024 ** 2):.2f} MB"
    return f"{num_bytes / (1024 ** 3):.2f} GB"


def _savings_percentage(matrix_bytes: int, inverted_bytes: int) -> float:
    """Computes percentage of RAM saved by Inverted Lists compared to Matrices."""
    if matrix_bytes <= 0:
        return 0.0
    return round((1.0 - (inverted_bytes / matrix_bytes)) * 100, 1)


def compute_index_metrics(index: MultiModelIndex) -> Dict[str, Any]:
    """Computes corpus dimensions and per-model RAM comparisons."""
    models_breakdown: Dict[str, Dict[str, Any]] = {}
    total_matrices_bytes = 0
    total_inverted_bytes = 0

    for model_key, model_data in index.models.items():
        doc_term_bytes = deep_getsizeof(model_data.doc_term)
        term_doc_bytes = deep_getsizeof(model_data.term_doc)
        matrix_bytes = doc_term_bytes + term_doc_bytes
        inverted_bytes = deep_getsizeof(model_data.inverted_index)

        total_matrices_bytes += matrix_bytes
        total_inverted_bytes += inverted_bytes

        models_breakdown[model_key] = {
            "name": model_data.name,
            "doc_term_bytes": doc_term_bytes,
            "doc_term_formatted": format_bytes(doc_term_bytes),
            "term_doc_bytes": term_doc_bytes,
            "term_doc_formatted": format_bytes(term_doc_bytes),
            "total_matrix_bytes": matrix_bytes,
            "total_matrix_formatted": format_bytes(matrix_bytes),
            "inverted_index_bytes": inverted_bytes,
            "inverted_index_formatted": format_bytes(inverted_bytes),
            "savings_ratio": _savings_percentage(matrix_bytes, inverted_bytes),
        }

    return {
        "num_documents": index.num_documents,
        "vocabulary_size": index.vocabulary_size,
        "total_matrices_bytes": total_matrices_bytes,
        "total_matrices_formatted": format_bytes(total_matrices_bytes),
        "total_inverted_bytes": total_inverted_bytes,
        "total_inverted_formatted": format_bytes(total_inverted_bytes),
        "global_savings_percent": _savings_percentage(total_matrices_bytes, total_inverted_bytes),
        "models_breakdown": models_breakdown,
    }
