"""Serialization and Persistence Module.
Saves, loads, imports, exports, and deletes MultiModelIndex structures on disk
in JSON and binary Pickle formats.
"""

import os
import json
import time
import pickle
from typing import Any, Dict, List, Optional, Tuple
from .indexer import MultiModelIndex


DEFAULT_SAVE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "saved_indexes")


def ensure_dir(path: str):
    """Creates directory if it does not exist."""
    if not os.path.exists(path):
        os.makedirs(path, exist_ok=True)


def sanitize_checkpoint_name(raw_name: str) -> str:
    """
    Extracts a safe alphanumeric/underscore/hyphen base name without extensions
    or directory traversal characters.
    """
    base = os.path.basename(raw_name or "")
    for ext in (".json", ".pkl"):
        if base.lower().endswith(ext):
            base = base[: -len(ext)]
    clean = "".join(c for c in base if c.isalnum() or c in ("-", "_")).strip()
    return clean or "index"


def index_from_json_dict(data: Dict[str, Any]) -> Tuple[MultiModelIndex, Dict[str, Any]]:
    """
    Reconstructs a complete MultiModelIndex (including Inverted Lists, Doc-Term,
    and Term-Doc matrices across all 4 models) from a parsed JSON checkpoint dictionary.
    """
    if not isinstance(data, dict):
        raise ValueError("Invalid index JSON root: expected an object.")

    inverted_dict = data.get("inverted_indexes")
    vocabulary = data.get("vocabulary")
    if not isinstance(inverted_dict, dict) or not isinstance(vocabulary, list):
        raise ValueError(
            "Invalid index schema: JSON must contain 'vocabulary' (list) and 'inverted_indexes' (object)."
        )

    meta = data.get("metadata", {}) if isinstance(data.get("metadata"), dict) else {}
    index = MultiModelIndex()
    index.vocabulary = [str(t) for t in vocabulary]

    # Collect doc_ids from metadata or derive from postings if omitted
    raw_doc_ids = meta.get("doc_ids", [])
    doc_id_set = {str(d) for d in raw_doc_ids} if isinstance(raw_doc_ids, list) else set()
    for postings_dict in inverted_dict.values():
        if isinstance(postings_dict, dict):
            for post_list in postings_dict.values():
                if isinstance(post_list, list):
                    for pair in post_list:
                        if isinstance(pair, (list, tuple)) and len(pair) >= 2:
                            doc_id_set.add(str(pair[0]))

    index.doc_ids = sorted(list(doc_id_set), key=lambda x: int(x) if x.isdigit() else x)

    # Restore DF map (or recompute from postings if absent)
    raw_df = data.get("term_doc_freq", {})
    index.term_doc_freq = {t: int(raw_df.get(t, 0)) for t in index.vocabulary}

    # Initialize & populate all 3 structures per weighting model
    for model_key, model_obj in index.models.items():
        model_obj.doc_term = {doc_id: {} for doc_id in index.doc_ids}
        model_obj.term_doc = {t: {} for t in index.vocabulary}
        model_obj.inverted_index = {t: [] for t in index.vocabulary}

        postings_dict = inverted_dict.get(model_key, {})
        if not isinstance(postings_dict, dict):
            continue

        for term, post_list in postings_dict.items():
            if not isinstance(post_list, list):
                continue
            normalized_postings: List[Tuple[str, float]] = []
            for pair in post_list:
                if isinstance(pair, (list, tuple)) and len(pair) >= 2:
                    doc_id_str = str(pair[0])
                    weight_val = float(pair[1])
                    normalized_postings.append((doc_id_str, weight_val))
                    model_obj.doc_term.setdefault(doc_id_str, {})[term] = weight_val
                    model_obj.term_doc.setdefault(term, {})[doc_id_str] = weight_val

            model_obj.inverted_index[term] = normalized_postings
            if index.term_doc_freq.get(term, 0) == 0 and normalized_postings:
                index.term_doc_freq[term] = len(normalized_postings)

    return index, meta


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
    clean_name = sanitize_checkpoint_name(name)

    json_filename = f"{clean_name}.json"
    json_path = os.path.join(save_dir, json_filename)

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


def import_index_from_json_bytes(
    raw_bytes: bytes,
    original_filename: str = "uploaded_index.json",
    save_dir: str = DEFAULT_SAVE_DIR
) -> Dict[str, Any]:
    """
    Validates an uploaded JSON checkpoint file, reconstructs its MultiModelIndex,
    and saves both .json and .pkl representations into save_dir.
    """
    try:
        decoded = raw_bytes.decode("utf-8")
        data = json.loads(decoded)
    except Exception as exc:
        raise ValueError(f"Uploaded file is not valid UTF-8 JSON: {exc}") from exc

    index, meta = index_from_json_dict(data)
    file_stem = sanitize_checkpoint_name(original_filename) if original_filename else ""
    preferred_name = (
        file_stem
        if file_stem and file_stem != "uploaded_index"
        else (meta.get("name") or "imported_index")
    )
    pipeline_steps = meta.get("pipeline_steps", [])
    if not isinstance(pipeline_steps, list):
        pipeline_steps = []

    return save_index_to_disk(
        index=index,
        pipeline_steps=pipeline_steps,
        name=preferred_name,
        save_dir=save_dir,
        save_pickle=True
    )


def get_saved_index_file_path(
    filename: str,
    fmt: str = "json",
    save_dir: str = DEFAULT_SAVE_DIR
) -> Optional[Tuple[str, str]]:
    """
    Resolves a safe path inside save_dir for downloading a checkpoint (.json or .pkl).
    Returns (absolute_path, download_filename) or None if not found.
    """
    ensure_dir(save_dir)
    base_name = sanitize_checkpoint_name(filename)
    ext = "pkl" if fmt.lower() == "pkl" else "json"
    download_name = f"{base_name}.{ext}"
    full_path = os.path.join(save_dir, download_name)

    if os.path.isfile(full_path):
        return full_path, download_name
    return None


def delete_saved_index(
    filename: str,
    save_dir: str = DEFAULT_SAVE_DIR
) -> bool:
    """
    Deletes both {name}.json and {name}.pkl for a given checkpoint from save_dir.
    Returns True if at least one file was removed.
    """
    ensure_dir(save_dir)
    base_name = sanitize_checkpoint_name(filename)
    removed_any = False

    for ext in ("json", "pkl"):
        target = os.path.join(save_dir, f"{base_name}.{ext}")
        if os.path.isfile(target):
            os.remove(target)
            removed_any = True

    return removed_any


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

    entries.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return entries


def load_index_from_disk(
    filename: str,
    save_dir: str = DEFAULT_SAVE_DIR
) -> Tuple[Optional[MultiModelIndex], Dict[str, Any]]:
    """
    Loads an index from disk. Tries pickle first for performance, falls back to JSON.
    """
    base_name = sanitize_checkpoint_name(filename)
    pickle_path = os.path.join(save_dir, f"{base_name}.pkl")
    json_path = os.path.join(save_dir, f"{base_name}.json")

    if os.path.exists(pickle_path):
        with open(pickle_path, "rb") as f:
            data = pickle.load(f)
        return data["index"], {
            "name": base_name,
            "pipeline_steps": data.get("pipeline_steps", []),
            "timestamp": data.get("timestamp", "")
        }

    if os.path.exists(json_path):
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return index_from_json_dict(data)

    return None, {}
