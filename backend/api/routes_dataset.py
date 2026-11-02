"""Dataset management routes.
"""

import os
from fastapi import APIRouter, File, UploadFile, HTTPException
from typing import Dict, List, Optional
from state import state
from core.parser import parse_document_file, Document


router = APIRouter(prefix="/api/dataset", tags=["Dataset"])

SAMPLE_FILE_PATH = os.path.join(
    os.path.dirname(os.path.dirname(__file__)),
    "data", "samples", "reuters_sample.sgm"
)


@router.get("/sample")
def load_sample_dataset():
    """Loads the built-in sample Reuters-21578 dataset."""
    if not os.path.exists(SAMPLE_FILE_PATH):
        raise HTTPException(status_code=404, detail="Sample dataset not found.")

    with open(SAMPLE_FILE_PATH, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()

    docs = parse_document_file(content, "reuters_sample.sgm")
    state.set_documents(docs, "Reuters-21578 Sample (20 Documents)")

    return {
        "status": "success",
        "dataset_name": state.current_dataset_name,
        "count": len(docs),
        "documents": [d.to_dict() for d in docs[:10]],
        "message": f"Successfully loaded {len(docs)} Reuters documents."
    }


@router.post("/upload")
async def upload_dataset(file: UploadFile = File(...)):
    """Uploads and parses a dataset file (.sgm, .xml, .txt)."""
    try:
        content_bytes = await file.read()
        content = content_bytes.decode("utf-8", errors="ignore")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read file: {str(e)}")

    docs = parse_document_file(content, file.filename)
    if not docs:
        raise HTTPException(status_code=400, detail="No documents could be extracted from this file.")

    state.set_documents(docs, file.filename)

    return {
        "status": "success",
        "dataset_name": file.filename,
        "count": len(docs),
        "documents": [d.to_dict() for d in docs[:10]],
        "message": f"Successfully ingested {len(docs)} documents from {file.filename}."
    }


@router.get("/documents")
def get_documents(page: int = 1, page_size: int = 10):
    """Returns paginated list of ingested documents."""
    total = len(state.documents)
    start = (page - 1) * page_size
    end = start + page_size
    sliced = state.documents[start:end]

    return {
        "dataset_name": state.current_dataset_name,
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": [d.to_dict() for d in sliced]
    }


@router.get("/documents/{doc_id}")
def get_document_detail(doc_id: str):
    """Returns full details of a specific document."""
    doc = state.get_document_by_id(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    return {
        "doc_id": doc.doc_id,
        "title": doc.title,
        "body": doc.body,
        "topics": doc.topics,
        "full_text": doc.full_text
    }

