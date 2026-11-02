"""Memory Monitoring and Metrics Engine.
Computes true deep RAM footprint using recursive sys.getsizeof.
Compares Matrix representations against Inverted Lists.
"""

import sys
from typing import Any, Dict, Set
from .indexer import MultiModelIndex


def deep_getsizeof(obj: Any, seen: Set[int] = None) -> int:
    """
    Recursively computes the true in-memory size (in bytes) of a Python object,
    including all nested dictionaries, lists, tuples, sets, and strings.
    Avoids double-counting shared references via object id tracking.
    """
    if seen is None:
        seen = set()

    obj_id = id(obj)
    if obj_id in seen:
        return 0

    seen.add(obj_id)
    size = sys.getsizeof(obj)

    if isinstance(obj, dict):
        for k, v in obj.items():
            size += deep_getsizeof(k, seen)
            size += deep_getsizeof(v, seen)
    elif isinstance(obj, (list, tuple, set, frozenset)):
        for item in obj:
            size += deep_getsizeof(item, seen)

    return size


def format_bytes(bytes_num: int) -> str:
    """Formats raw byte count into human-readable B, KB, MB, GB."""
    if bytes_num < 1024:
        return f"{bytes_num} B"
    elif bytes_num < 1024 * 1024:
        return f"{bytes_num / 1024:.2f} KB"
    elif bytes_num < 1024 * 1024 * 1024:
        return f"{bytes_num / (1024 * 1024):.2f} MB"
    else:
        return f"{bytes_num / (1024 * 1024 * 1024):.2f} GB"


def compute_index_metrics(index: MultiModelIndex) -> Dict[str, Any]:
    """
    Computes all required post-indexing metrics:
    - Vocabulary dimension (|V|)
    - Document count (N)
    - RAM occupied by Matrices (Doc-Term & Term-Doc) vs Inverted Lists (Posting Lists)
    - Savings percentage
    """
    num_docs = index.num_documents
    vocab_size = index.vocabulary_size

    # Measure memory for each model's structures
    model_memory: Dict[str, Dict[str, Any]] = {}
    total_matrices_bytes = 0
    total_inverted_bytes = 0

    for model_name, model_data in index.models.items():
        doc_term_bytes = deep_getsizeof(model_data.doc_term)
        term_doc_bytes = deep_getsizeof(model_data.term_doc)
        matrix_bytes = doc_term_bytes + term_doc_bytes

        inverted_bytes = deep_getsizeof(model_data.inverted_index)

        total_matrices_bytes += matrix_bytes
        total_inverted_bytes += inverted_bytes

        model_memory[model_name] = {
            "name": model_data.name,
            "doc_term_bytes": doc_term_bytes,
            "doc_term_formatted": format_bytes(doc_term_bytes),
            "term_doc_bytes": term_doc_bytes,
            "term_doc_formatted": format_bytes(term_doc_bytes),
            "total_matrix_bytes": matrix_bytes,
            "total_matrix_formatted": format_bytes(matrix_bytes),
            "inverted_index_bytes": inverted_bytes,
            "inverted_index_formatted": format_bytes(inverted_bytes),
            "savings_ratio": round((1.0 - (inverted_bytes / matrix_bytes)) * 100, 1) if matrix_bytes > 0 else 0
        }

    # Global savings comparison
    global_savings_percent = round(
        (1.0 - (float(total_inverted_bytes) / float(total_matrices_bytes))) * 100, 1
    ) if total_matrices_bytes > 0 else 0

    return {
        "num_documents": num_docs,
        "vocabulary_size": vocab_size,
        "total_matrices_bytes": total_matrices_bytes,
        "total_matrices_formatted": format_bytes(total_matrices_bytes),
        "total_inverted_bytes": total_inverted_bytes,
        "total_inverted_formatted": format_bytes(total_inverted_bytes),
        "global_savings_percent": global_savings_percent,
        "models_breakdown": model_memory
    }

