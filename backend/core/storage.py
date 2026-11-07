"""Index Serialization and Disk Persistence.

Persists, loads, imports, downloads, and deletes `MultiModelIndex` checkpoints
in human-readable JSON (`.json`) and fast binary Pickle (`.pkl`) formats.
"""

import json
import os
import pickle
import time
from typing import Any, Dict, List, Optional, Set, Tuple
from .indexer import MultiModelIndex, doc_id_sort_key


DEFAULT_SAVE_DIR = os.path.join(
    os.path.dirname(os.path.dirname(__file__)), "data", "saved_indexes"
)


def sanitize_checkpoint_name(raw_name: str) -> str:
    """Strips file extensions and unsafe path characters from a checkpoint name."""
    base = os.path.basename(raw_name or "")
    for ext in (".json", ".pkl"):
        if base.lower().endswith(ext):
            base = base[: -len(ext)]
    clean = "".join(ch for ch in base if ch.isalnum() or ch in ("-", "_")).strip()
    return clean or "index"


def _collect_doc_ids(meta: Dict[str, Any], inverted_indexes: Dict[str, Any]) -> List[str]:
    """Reads `doc_ids` from metadata, or derives them from posting pairs if omitted."""
    raw_ids = meta.get("doc_ids")
    if isinstance(raw_ids, list) and raw_ids:
        return sorted((str(d) for d in raw_ids), key=doc_id_sort_key)

    discovered: Set[str] = set()
    for postings_by_term in inverted_indexes.values():
        if not isinstance(postings_by_term, dict):
            continue
        for post_list in postings_by_term.values():
            if not isinstance(post_list, list):
                continue
            for pair in post_list:
                if isinstance(pair, (list, tuple)) and len(pair) >= 2:
                    discovered.add(str(pair[0]))

    return sorted(discovered, key=doc_id_sort_key)


def index_from_json_dict(data: Dict[str, Any]) -> Tuple[MultiModelIndex, Dict[str, Any]]:
    """Reconstructs a `MultiModelIndex` (all 4 models x 3 structures) from parsed JSON."""
    if not isinstance(data, dict):
        raise ValueError("Invalid index JSON: root must be an object.")

    vocabulary = data.get("vocabulary")
    inverted_indexes = data.get("inverted_indexes")
    if not isinstance(vocabulary, list) or not isinstance(inverted_indexes, dict):
        raise ValueError("JSON checkpoint must contain 'vocabulary' and 'inverted_indexes'.")

    meta = data.get("metadata") if isinstance(data.get("metadata"), dict) else {}
    raw_df = data.get("term_doc_freq") if isinstance(data.get("term_doc_freq"), dict) else {}

    index = MultiModelIndex()
    index.vocabulary = [str(term) for term in vocabulary]
    index.doc_ids = _collect_doc_ids(meta, inverted_indexes)
    index.term_doc_freq = {t: int(raw_df.get(t, 0)) for t in index.vocabulary}
    index.init_model_structures()

    for model_key, model_obj in index.models.items():
        postings_by_term = inverted_indexes.get(model_key, {})
        if not isinstance(postings_by_term, dict):
            continue

        for term, post_list in postings_by_term.items():
            if not isinstance(post_list, list):
                continue
            postings: List[Tuple[str, float]] = []
            for pair in post_list:
                if isinstance(pair, (list, tuple)) and len(pair) >= 2:
                    doc_id, weight = str(pair[0]), float(pair[1])
                    postings.append((doc_id, weight))
                    index.set_weight(model_key, doc_id, term, weight)

            model_obj.inverted_index[term] = postings
            if index.term_doc_freq.get(term, 0) == 0 and postings:
                index.term_doc_freq[term] = len(postings)

    return index, meta


def save_index_to_disk(
    index: MultiModelIndex,
    pipeline_steps: List[str],
    name: str = "reuters_index",
    save_dir: str = DEFAULT_SAVE_DIR,
    save_pickle: bool = True,
) -> Dict[str, Any]:
    """Serializes `index` to `{name}.json` and (optionally) `{name}.pkl`."""
    os.makedirs(save_dir, exist_ok=True)
    clean_name = sanitize_checkpoint_name(name)
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S")

    json_filename = f"{clean_name}.json"
    json_path = os.path.join(save_dir, json_filename)
    payload = {
        "metadata": {
            "name": clean_name,
            "created_at": timestamp,
            "num_documents": index.num_documents,
            "vocabulary_size": index.vocabulary_size,
            "pipeline_steps": pipeline_steps,
            "doc_ids": index.doc_ids,
        },
        "vocabulary": index.vocabulary,
        "term_doc_freq": index.term_doc_freq,
        "inverted_indexes": {k: m.inverted_index for k, m in index.models.items()},
    }

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)

    pickle_filename = None
    pickle_size = 0
    if save_pickle:
        pickle_filename = f"{clean_name}.pkl"
        pickle_path = os.path.join(save_dir, pickle_filename)
        with open(pickle_path, "wb") as f:
            pickle.dump(
                {"index": index, "pipeline_steps": pipeline_steps, "timestamp": timestamp},
                f,
            )
        pickle_size = os.path.getsize(pickle_path)

    return {
        "name": clean_name,
        "timestamp": timestamp,
        "json_file": json_filename,
        "json_path": json_path,
        "json_size_bytes": os.path.getsize(json_path),
        "pickle_file": pickle_filename,
        "pickle_size_bytes": pickle_size,
        "num_documents": index.num_documents,
        "vocabulary_size": index.vocabulary_size,
        "pipeline_steps": pipeline_steps,
    }


def load_index_from_disk(
    filename: str,
    save_dir: str = DEFAULT_SAVE_DIR,
) -> Tuple[Optional[MultiModelIndex], Dict[str, Any]]:
    """Loads a saved checkpoint from `.pkl` (fast path) or `.json` (portable fallback)."""
    base_name = sanitize_checkpoint_name(filename)
    pickle_path = os.path.join(save_dir, f"{base_name}.pkl")
    json_path = os.path.join(save_dir, f"{base_name}.json")

    if os.path.isfile(pickle_path):
        try:
            with open(pickle_path, "rb") as f:
                saved = pickle.load(f)
            return saved["index"], {
                "name": base_name,
                "pipeline_steps": saved.get("pipeline_steps", []),
                "timestamp": saved.get("timestamp", ""),
            }
        except Exception:
            pass  # Fall back to JSON reconstruction if binary pickle is incompatible

    if os.path.isfile(json_path):
        with open(json_path, "r", encoding="utf-8") as f:
            return index_from_json_dict(json.load(f))

    return None, {}


def list_saved_indexes(save_dir: str = DEFAULT_SAVE_DIR) -> List[Dict[str, Any]]:
    """Lists metadata for all `.json` checkpoints stored in `save_dir`."""
    os.makedirs(save_dir, exist_ok=True)
    entries: List[Dict[str, Any]] = []

    for fname in os.listdir(save_dir):
        if not fname.endswith(".json"):
            continue
        fpath = os.path.join(save_dir, fname)
        try:
            with open(fpath, "r", encoding="utf-8") as f:
                data = json.load(f)
            meta = data.get("metadata", {})
            stat = os.stat(fpath)
            entries.append({
                "filename": fname,
                "name": meta.get("name", fname[:-5]),
                "created_at": meta.get("created_at", time.ctime(stat.st_mtime)),
                "num_documents": meta.get("num_documents", len(meta.get("doc_ids", []))),
                "vocabulary_size": meta.get("vocabulary_size", len(data.get("vocabulary", []))),
                "pipeline_steps": meta.get("pipeline_steps", []),
                "size_bytes": stat.st_size,
            })
        except Exception:
            continue

    entries.sort(key=lambda item: item.get("created_at", ""), reverse=True)
    return entries


def import_index_from_json_bytes(
    raw_bytes: bytes,
    original_filename: str = "uploaded_index.json",
    save_dir: str = DEFAULT_SAVE_DIR,
) -> Dict[str, Any]:
    """Validates an uploaded JSON checkpoint and persists it into `save_dir`."""
    try:
        data = json.loads(raw_bytes.decode("utf-8"))
    except Exception as exc:
        raise ValueError(f"Uploaded file is not valid UTF-8 JSON: {exc}") from exc

    index, meta = index_from_json_dict(data)
    stem = sanitize_checkpoint_name(original_filename) if original_filename else ""
    name = stem if stem and stem != "uploaded_index" else (meta.get("name") or "imported_index")
    steps = meta.get("pipeline_steps") if isinstance(meta.get("pipeline_steps"), list) else []

    return save_index_to_disk(index, steps, name=name, save_dir=save_dir, save_pickle=True)


def get_saved_index_file_path(
    filename: str,
    fmt: str = "json",
    save_dir: str = DEFAULT_SAVE_DIR,
) -> Optional[Tuple[str, str]]:
    """Returns `(full_path, download_filename)` for a saved checkpoint, or `None`."""
    os.makedirs(save_dir, exist_ok=True)
    ext = "pkl" if fmt.lower() == "pkl" else "json"
    download_name = f"{sanitize_checkpoint_name(filename)}.{ext}"
    full_path = os.path.join(save_dir, download_name)
    return (full_path, download_name) if os.path.isfile(full_path) else None


def delete_saved_index(filename: str, save_dir: str = DEFAULT_SAVE_DIR) -> bool:
    """Deletes `{name}.json` and `{name}.pkl` from `save_dir`."""
    os.makedirs(save_dir, exist_ok=True)
    base_name = sanitize_checkpoint_name(filename)
    removed = False

    for ext in ("json", "pkl"):
        target = os.path.join(save_dir, f"{base_name}.{ext}")
        if os.path.isfile(target):
            os.remove(target)
            removed = True

    return removed
