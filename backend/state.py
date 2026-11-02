"""Global in-memory application state for search engine backend.
Manages loaded documents, active pipeline configuration, and generated MultiModelIndex.
"""

from typing import Dict, List, Optional
from core.parser import Document
from core.indexer import MultiModelIndex
from core.pipeline import DynamicNLPPipeline


class AppState:
    def __init__(self):
        self.documents: List[Document] = []
        self.active_pipeline: DynamicNLPPipeline = DynamicNLPPipeline()
        self.current_index: Optional[MultiModelIndex] = None
        self.latest_metrics: Dict = {}
        self.last_execution_time_ms: float = 0.0
        self.current_dataset_name: str = "None"

    def set_documents(self, docs: List[Document], dataset_name: str = "Uploaded Dataset"):
        self.documents = docs
        self.current_dataset_name = dataset_name
        self.current_index = None
        self.latest_metrics = {}

    def get_document_by_id(self, doc_id: str) -> Optional[Document]:
        for doc in self.documents:
            if doc.doc_id == str(doc_id):
                return doc
        return None


# Global singleton instance
state = AppState()

