"""Serialization and Persistence Module.
Saves and loads MultiModelIndex structures to/from disk in JSON and binary Pickle formats.
Designed for immediate reuse in Phase 2 (Client Search Engine).
"""

import os
import json
import time
import pickle
from typing import Any, Dict, List, Optional, Tuple
from .indexer import MultiModelIndex, ModelIndexData


DEFAULT_SAVE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "saved_indexes")


def ensure_dir(path: str):
    """Creates directory if it does not exist."""
    if not os.path.exists(path):
        os.makedirs(path, exist_ok=True)


def save_index_to_disk(
    index: MultiModelIndex,
    pipeline_steps: List[str],
    name: str = "reuters_index",
    save_dir: str = DEFAULT_SAVE_DIR,
    save_pickle: bool = True
) -> Dict[str, Any]:
    """
    Saves the entire multi-model index to disk.
    Creates:
    - {name}.json : Full human-readable JSON containing metadata, vocab, and Inverted Lists
    - {name}.pkl  : Fast binary pickle containing the entire MultiModelIndex object
    """
    ensure_dir(save_dir)
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
    clean_name = "".join(c for c in name if c.isalnum() or c in ("-", "_")).strip() or "index"

    json_filename = f"{clean_name}.json"
    json_path = os.path.join(save_dir, json_filename)

    # 1. Prepare exportable JSON payload
    export_payload = {
        "metadata": {
            "name": clean_name,
            "created_at": timestamp,
            "num_documents": index.num_documents,
            "vocabulary_size": index.vocabulary_size,
            "pipeline_steps": pipeline_steps,
            "doc_ids": index.doc_ids
        },
        "vocabulary": index.vocabulary,
        "term_doc_freq": index.term_doc_freq,
        "inverted_indexes": {
            model_key: model_data.inverted_index
            for model_key, model_data in index.models.items()
        }
    }

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(export_payload, f, indent=2)

    json_file_size = os.path.getsize(json_path)

    pickle_filename = None
    pickle_file_size = 0
    if save_pickle:
        pickle_filename = f"{clean_name}.pkl"
        pickle_path = os.path.join(save_dir, pickle_filename)
        with open(pickle_path, "wb") as f:
            pickle.dump({
                "index": index,
                "pipeline_steps": pipeline_steps,
                "timestamp": timestamp
            }, f)
        pickle_file_size = os.path.getsize(pickle_path)

    return {
        "name": clean_name,
        "timestamp": timestamp,
        "json_file": json_filename,
        "json_path": json_path,
        "json_size_bytes": json_file_size,
        "pickle_file": pickle_filename,
        "pickle_size_bytes": pickle_file_size,
        "num_documents": index.num_documents,
        "vocabulary_size": index.vocabulary_size,
        "pipeline_steps": pipeline_steps
    }


def list_saved_indexes(save_dir: str = DEFAULT_SAVE_DIR) -> List[Dict[str, Any]]:
    """Lists all saved index checkpoints currently on disk."""
    ensure_dir(save_dir)
    entries = []

    for fname in os.listdir(save_dir):
        if fname.endswith(".json"):
            fpath = os.path.join(save_dir, fname)
            try:
                with open(fpath, "r", encoding="utf-8") as f:
                    data = json.load(f)
                meta = data.get("metadata", {})
                file_stat = os.stat(fpath)
                entries.append({
                    "filename": fname,
                    "name": meta.get("name", fname.replace(".json", "")),
                    "created_at": meta.get("created_at", time.ctime(file_stat.st_mtime)),
                    "num_documents": meta.get("num_documents", len(meta.get("doc_ids", []))),
                    "vocabulary_size": meta.get("vocabulary_size", len(data.get("vocabulary", []))),
                    "pipeline_steps": meta.get("pipeline_steps", []),
                    "size_bytes": file_stat.st_size
                })
            except Exception:
                continue

    # Sort descending by modification time
    entries.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return entries


def load_index_from_disk(
    filename: str,
    save_dir: str = DEFAULT_SAVE_DIR
) -> Tuple[Optional[MultiModelIndex], Dict[str, Any]]:
    """
    Loads an index from disk. Tries pickle first for performance, falls back to JSON.
    """
    base_name = filename.replace(".json", "").replace(".pkl", "")
    pickle_path = os.path.join(save_dir, f"{base_name}.pkl")
    json_path = os.path.join(save_dir, f"{base_name}.json")

    # Fast binary load
    if os.path.exists(pickle_path):
        with open(pickle_path, "rb") as f:
            data = pickle.load(f)
        return data["index"], {
            "name": base_name,
            "pipeline_steps": data.get("pipeline_steps", []),
            "timestamp": data.get("timestamp", "")
        }

    # Fallback to JSON
    if os.path.exists(json_path):
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        meta = data.get("metadata", {})
        index = MultiModelIndex()
        index.vocabulary = data.get("vocabulary", [])
        index.term_doc_freq = data.get("term_doc_freq", {})
        index.doc_ids = meta.get("doc_ids", [])

        # Restore inverted indexes
        inverted_dict = data.get("inverted_indexes", {})
        for model_key, postings_dict in inverted_dict.items():
            if model_key in index.models:
                index.models[model_key].inverted_index = {
                    t: [(p[0], p[1]) for p in post_list]
                    for t, post_list in postings_dict.items()
                }

        return index, meta

    return None, {}

