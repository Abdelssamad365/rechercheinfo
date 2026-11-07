"""Multi-model index generation, metrics, and inspection endpoints (`/api/index`)."""

import time
from typing import Dict, List
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from core.indexer import MultiModelIndex
from core.memory_monitor import compute_index_metrics
from core.pipeline import DynamicNLPPipeline
from state import state


router = APIRouter(prefix="/api/index", tags=["Index"])


class GenerateIndexReq(BaseModel):
    step_order: List[str]


@router.post("/generate")
def generate_indexes(req: GenerateIndexReq):
    """Preprocesses the active corpus and builds BoW, F, TF, and TF-IDF indexes."""
    if not state.documents:
        try:
            state.load_sample_dataset()
        except FileNotFoundError as exc:
            raise HTTPException(status_code=400, detail="No documents loaded to index.") from exc

    start_time = time.perf_counter()

    # 1. Configure NLP pipeline with user-selected order
    pipeline = DynamicNLPPipeline(req.step_order)
    state.active_pipeline = pipeline

    # 2. Tokenize all documents through the pipeline
    processed_corpus: Dict[str, List[str]] = {}
    total_tokens = 0
    for doc in state.documents:
        tokens = pipeline.process(doc.full_text)
        processed_corpus[doc.doc_id] = tokens
        total_tokens += len(tokens)

    # 3. Build all 4 models x 3 representations and profile deep RAM usage
    index = MultiModelIndex()
    index.build(processed_corpus)
    metrics = compute_index_metrics(index)

    elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
    state.set_index(index, metrics, execution_time_ms=elapsed_ms, total_tokens=total_tokens)

    return {
        "status": "success",
        "message": f"Successfully indexed {index.num_documents} documents across 4 models.",
        "execution_time_ms": elapsed_ms,
        "total_tokens_processed": total_tokens,
        "num_documents": index.num_documents,
        "vocabulary_size": index.vocabulary_size,
        "pipeline_steps": pipeline.step_order,
        "metrics": metrics,
    }


@router.get("/metrics")
def get_index_metrics():
    """Returns RAM benchmarks and dimensionality metrics for the active index."""
    if not state.current_index:
        raise HTTPException(status_code=400, detail="No index has been generated yet.")

    return {
        "dataset_name": state.current_dataset_name,
        "num_documents": state.current_index.num_documents,
        "vocabulary_size": state.current_index.vocabulary_size,
        "execution_time_ms": state.last_execution_time_ms,
        "total_tokens_processed": state.total_tokens_processed,
        "pipeline_steps": state.active_pipeline.step_order,
        "metrics": state.latest_metrics,
    }


@router.get("/matrix")
def get_matrix_slice(
    model: str = Query("tfidf", description="Weighting model: bow, f, tf, tfidf"),
    matrix_type: str = Query("doc_term", description="Matrix orientation: doc_term or term_doc"),
    page: int = Query(1, ge=1),
    page_size: int = Query(15, ge=1, le=100),
    term_filter: str = Query("", description="Optional vocabulary substring filter"),
):
    """Returns a paginated slice of the Document-Term or Term-Document matrix."""
    if not state.current_index:
        raise HTTPException(status_code=400, detail="No index generated yet.")

    return state.current_index.get_matrix_slice(
        model_name=model,
        matrix_type=matrix_type,
        page=page,
        page_size=page_size,
        term_filter=term_filter,
    )


@router.get("/postings")
def get_postings(
    model: str = Query("tfidf", description="Weighting model: bow, f, tf, tfidf"),
    query: str = Query("", description="Optional vocabulary substring filter"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """Returns paginated Inverted Lists (Posting Lists) for vocabulary terms."""
    if not state.current_index:
        raise HTTPException(status_code=400, detail="No index generated yet.")

    return state.current_index.get_postings(
        model_name=model,
        query=query,
        page=page,
        page_size=page_size,
    )
