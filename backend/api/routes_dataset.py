"""Dataset ingestion and document inspection endpoints (`/api/dataset`)."""

from fastapi import APIRouter, File, HTTPException, UploadFile
from core.indexer import paginate
from core.parser import parse_document_file
from state import state


router = APIRouter(prefix="/api/dataset", tags=["Dataset"])


@router.get("/sample")
def load_sample_dataset():
    """Reloads the built-in 20-document Reuters-21578 SGML collection."""
    try:
        docs = state.load_sample_dataset()
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    return {
        "status": "success",
        "dataset_name": state.current_dataset_name,
        "count": len(docs),
        "documents": [d.to_dict() for d in docs[:10]],
        "message": f"Successfully loaded {len(docs)} Reuters documents.",
    }


@router.post("/upload")
async def upload_dataset(file: UploadFile = File(...)):
    """Ingests an uploaded `.sgm`, `.xml`, or plain-text dataset file."""
    filename = file.filename or "uploaded_dataset.txt"
    try:
        raw_bytes = await file.read()
        content = raw_bytes.decode("utf-8", errors="ignore")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to read file: {exc}") from exc

    docs = parse_document_file(content, filename)
    if not docs:
        raise HTTPException(status_code=400, detail="No documents could be extracted from this file.")

    state.set_documents(docs, filename)
    return {
        "status": "success",
        "dataset_name": filename,
        "count": len(docs),
        "documents": [d.to_dict() for d in docs[:10]],
        "message": f"Successfully ingested {len(docs)} documents from {filename}.",
    }


@router.get("/documents")
def get_documents(page: int = 1, page_size: int = 10):
    """Returns a paginated slice of currently loaded documents."""
    page_items = paginate(state.documents, page, page_size)
    return {
        "dataset_name": state.current_dataset_name,
        "total": len(state.documents),
        "page": page,
        "page_size": page_size,
        "items": [doc.to_dict() for doc in page_items],
    }


@router.get("/documents/{doc_id}")
def get_document_detail(doc_id: str):
    """Returns the full text and metadata of a single document by ID."""
    doc = state.get_document_by_id(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail=f"Document '{doc_id}' not found.")

    return {
        "doc_id": doc.doc_id,
        "title": doc.title,
        "body": doc.body,
        "topics": doc.topics,
        "full_text": doc.full_text,
    }
