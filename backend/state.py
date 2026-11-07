"""Centralized in-memory state for the Admin Search Engine API."""

import os
from typing import Any, Dict, List, Optional
from core.indexer import MultiModelIndex
from core.parser import Document, parse_document_file
from core.pipeline import DynamicNLPPipeline


SAMPLE_FILE_PATH = os.path.join(
    os.path.dirname(__file__), "data", "samples", "reuters_sample.sgm"
)
SAMPLE_DATASET_NAME = "Reuters-21578 Sample (20 Documents)"


class AppState:
    """Holds the active document collection, NLP pipeline, and generated index."""

    def __init__(self):
        self.documents: List[Document] = []
        self.current_dataset_name: str = "None"
        self.active_pipeline: DynamicNLPPipeline = DynamicNLPPipeline()
        self.current_index: Optional[MultiModelIndex] = None
        self.latest_metrics: Dict[str, Any] = {}
        self.last_execution_time_ms: float = 0.0
        self.total_tokens_processed: int = 0

    def set_documents(self, docs: List[Document], dataset_name: str = "Uploaded Dataset") -> None:
        """Replaces the active corpus and clears any previously generated index."""
        self.documents = docs
        self.current_dataset_name = dataset_name
        self.current_index = None
        self.latest_metrics = {}
        self.last_execution_time_ms = 0.0
        self.total_tokens_processed = 0

    def load_sample_dataset(self) -> List[Document]:
        """Loads and parses the built-in 20-document Reuters-21578 SGML sample."""
        if not os.path.isfile(SAMPLE_FILE_PATH):
            raise FileNotFoundError(f"Sample dataset missing at {SAMPLE_FILE_PATH}")

        with open(SAMPLE_FILE_PATH, "r", encoding="utf-8", errors="ignore") as f:
            docs = parse_document_file(f.read(), "reuters_sample.sgm")

        self.set_documents(docs, SAMPLE_DATASET_NAME)
        return docs

    def set_index(
        self,
        index: MultiModelIndex,
        metrics: Dict[str, Any],
        execution_time_ms: float = 0.0,
        total_tokens: int = 0,
    ) -> None:
        """Stores a newly built or restored index along with its RAM metrics."""
        self.current_index = index
        self.latest_metrics = metrics
        self.last_execution_time_ms = execution_time_ms
        self.total_tokens_processed = total_tokens

    def get_document_by_id(self, doc_id: str) -> Optional[Document]:
        """Finds a document in the active corpus by its string ID."""
        target = str(doc_id)
        for doc in self.documents:
            if doc.doc_id == target:
                return doc
        return None


state = AppState()
