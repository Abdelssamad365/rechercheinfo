"""Multi-Model Indexing routes.
Computes and retrieves BoW, F, TF, and TF-IDF models in Matrix and Inverted List formats.
"""

import time
import os
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from state import state
from core.pipeline import DynamicNLPPipeline
from core.indexer import MultiModelIndex
from core.memory_monitor import compute_index_metrics
from core.parser import parse_document_file


router = APIRouter(prefix="/api/index", tags=["Index"])


class GenerateIndexReq(BaseModel):
    step_order: List[str]


@router.post("/generate")
def generate_indexes(req: GenerateIndexReq):
    """
    Executes the dynamic NLP pipeline across all loaded documents and
    builds all 4 models (BoW, F, TF, TF-IDF) in both Matrix and Inverted List representations.
    Calculates deep RAM footprints.
    """
    # Auto-load sample if no documents loaded yet
    if not state.documents:
        sample_path = os.path.join(
            os.path.dirname(os.path.dirname(__file__)),
            "data", "samples", "reuters_sample.sgm"
        )
        if os.path.exists(sample_path):
            with open(sample_path, "r", encoding="utf-8", errors="ignore") as f:
                state.set_documents(parse_document_file(f.read(), "reuters_sample.sgm"), "Reuters Sample")
        else:
            raise HTTPException(status_code=400, detail="No documents loaded to index.")

    t0 = time.perf_counter()

    # 1. Instantiate pipeline with user-chosen order
    pipeline = DynamicNLPPipeline(req.step_order)
    state.active_pipeline = pipeline

    # 2. Process all documents
    processed_corpus: Dict[str, List[str]] = {}
    total_tokens_count = 0
    for doc in state.documents:
        tokens = pipeline.process(doc.full_text)
        processed_corpus[doc.doc_id] = tokens
        total_tokens_count += len(tokens)

    # 3. Build Multi-Model Index
    index = MultiModelIndex()
    index.build(processed_corpus)

    # 4. Measure deep RAM and compute metrics
    metrics = compute_index_metrics(index)

    t1 = time.perf_counter()
    execution_time_ms = round((t1 - t0) * 1000, 2)

    # Save to state
    state.current_index = index
    state.latest_metrics = metrics
    state.last_execution_time_ms = execution_time_ms

    return {
        "status": "success",
        "message": f"Successfully indexed {index.num_documents} documents across 4 models.",
        "execution_time_ms": execution_time_ms,
        "total_tokens_processed": total_tokens_count,
        "num_documents": index.num_documents,
        "vocabulary_size": index.vocabulary_size,
        "pipeline_steps": req.step_order,
        "metrics": metrics
    }


@router.get("/metrics")
def get_index_metrics():
    """Returns the latest post-indexing metrics and RAM analysis."""
    if not state.current_index:
        raise HTTPException(status_code=400, detail="No index has been generated yet.")

    return {
        "dataset_name": state.current_dataset_name,
        "num_documents": state.current_index.num_documents,
        "vocabulary_size": state.current_index.vocabulary_size,
        "execution_time_ms": state.last_execution_time_ms,
        "pipeline_steps": state.active_pipeline.step_order,
        "metrics": state.latest_metrics
    }


@router.get("/matrix")
def get_matrix_slice(
    model: str = Query("tfidf", description="bow, f, tf, tfidf"),
    matrix_type: str = Query("doc_term", description="doc_term or term_doc"),
    page: int = Query(1, ge=1),
    page_size: int = Query(15, ge=1, le=100),
    term_filter: str = Query("", description="Optional term filter")
):
    """
    Returns a paginated slice of the chosen Matrix (Document-Term or Term-Document).
    """
    if not state.current_index:
        raise HTTPException(status_code=400, detail="No index generated yet. Please click 'Generate Indexes'.")

    return state.current_index.get_matrix_slice(
        model_name=model,
        matrix_type=matrix_type,
        page=page,
        page_size=page_size,
        term_filter=term_filter
    )


@router.get("/postings")
def get_postings(
    model: str = Query("tfidf", description="bow, f, tf, tfidf"),
    query: str = Query("", description="Term search query"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100)
):
    """
    Returns paginated Inverted Lists (Posting Lists) for terms.
    """
    if not state.current_index:
        raise HTTPException(status_code=400, detail="No index generated yet. Please click 'Generate Indexes'.")

    return state.current_index.get_postings(
        model_name=model,
        query=query,
        page=page,
        page_size=page_size
    )

