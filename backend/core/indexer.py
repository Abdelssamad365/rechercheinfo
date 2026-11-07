"""Multi-Model Indexing Engine for Information Retrieval.

Builds 4 classical IR weighting models from scratch:
  - BoW   : Binary incidence (1 if term in doc, else 0)
  - F     : Raw term frequency f(t, d)
  - TF    : Max-normalized term frequency f(t, d) / max_{t' in d} f(t', d)
  - TF-IDF: TF(t, d) * log10(1 + N / df(t))

Each model is stored in 3 physical representations:
  1. Document-Term Matrix (D x V)
  2. Term-Document Matrix (V x D)
  3. Inverted Index / Posting Lists: term -> [(doc_id, weight), ...]
"""

import math
from typing import Any, Dict, List, Set, Tuple


# Materialize explicit 0.0 matrix entries up to 500k cells so RAM profiling reflects
# true dense D x V and V x D matrices without exhausting memory on huge corpora.
MAX_DENSE_MATRIX_CELLS = 500_000


def doc_id_sort_key(doc_id: str) -> Tuple[int, Any]:
    """Sorts numeric document IDs numerically first, then string IDs alphabetically."""
    text_id = str(doc_id)
    return (0, int(text_id)) if text_id.isdigit() else (1, text_id)


def paginate(items: List[Any], page: int, page_size: int) -> List[Any]:
    """Returns a 1-based page slice from `items`."""
    start = (page - 1) * page_size
    return items[start : start + page_size]


class ModelIndexData:
    """Stores the 3 physical index structures for a single weighting model."""

    def __init__(self, name: str):
        self.name = name
        self.doc_term: Dict[str, Dict[str, float]] = {}
        self.term_doc: Dict[str, Dict[str, float]] = {}
        self.inverted_index: Dict[str, List[Tuple[str, float]]] = {}


class MultiModelIndex:
    """Constructs and queries BoW, F, TF, and TF-IDF indexes across 3 structures."""

    def __init__(self):
        self.doc_ids: List[str] = []
        self.vocabulary: List[str] = []
        self.term_doc_freq: Dict[str, int] = {}
        self.doc_max_tf: Dict[str, int] = {}

        self.models: Dict[str, ModelIndexData] = {
            "bow": ModelIndexData("Bag of Words (Binary)"),
            "f": ModelIndexData("Raw Frequency (F)"),
            "tf": ModelIndexData("Normalized Term Frequency (TF)"),
            "tfidf": ModelIndexData("TF-IDF"),
        }

    @property
    def num_documents(self) -> int:
        return len(self.doc_ids)

    @property
    def vocabulary_size(self) -> int:
        return len(self.vocabulary)

    def init_model_structures(self) -> None:
        """Initializes dense matrices (D x V and V x D) and empty posting lists."""
        is_dense = (self.num_documents * self.vocabulary_size) <= MAX_DENSE_MATRIX_CELLS

        for model in self.models.values():
            if is_dense:
                model.doc_term = {d: dict.fromkeys(self.vocabulary, 0.0) for d in self.doc_ids}
                model.term_doc = {t: dict.fromkeys(self.doc_ids, 0.0) for t in self.vocabulary}
            else:
                model.doc_term = {d: {} for d in self.doc_ids}
                model.term_doc = {t: {} for t in self.vocabulary}
            model.inverted_index = {t: [] for t in self.vocabulary}

    def set_weight(self, model_key: str, doc_id: str, term: str, weight: float) -> None:
        """Writes `weight` into both matrix orientations for `model_key`."""
        model = self.models[model_key]
        model.doc_term.setdefault(doc_id, {})[term] = weight
        model.term_doc.setdefault(term, {})[doc_id] = weight

    @staticmethod
    def compute_weights(raw_count: int, max_tf: int, idf_score: float) -> Dict[str, float]:
        """Computes all 4 IR weighting models for a single `(term, document)` pair."""
        tf = round(raw_count / max(max_tf, 1), 4)
        return {
            "bow": 1.0,
            "f": float(raw_count),
            "tf": tf,
            "tfidf": round(tf * idf_score, 4),
        }

    def _count_corpus_terms(
        self,
        processed_corpus: Dict[str, List[str]],
    ) -> Dict[str, Dict[str, int]]:
        """Counts per-document term frequencies and builds vocabulary + DF(t)."""
        raw_counts: Dict[str, Dict[str, int]] = {}
        vocab_set: Set[str] = set()

        for doc_id, tokens in processed_corpus.items():
            counts: Dict[str, int] = {}
            for token in tokens:
                counts[token] = counts.get(token, 0) + 1
                vocab_set.add(token)

            raw_counts[doc_id] = counts
            self.doc_max_tf[doc_id] = max(counts.values()) if counts else 1

        self.vocabulary = sorted(vocab_set)
        self.term_doc_freq = dict.fromkeys(self.vocabulary, 0)
        for counts in raw_counts.values():
            for term in counts:
                self.term_doc_freq[term] += 1

        return raw_counts

    def _compute_idf_scores(self) -> Dict[str, float]:
        """Computes `IDF(t) = log10(1 + N / df(t))` for every vocabulary term."""
        n_docs = float(self.num_documents)
        return {
            term: (math.log10(1.0 + n_docs / df) if df > 0 else 0.0)
            for term, df in self.term_doc_freq.items()
        }

    def build(self, processed_corpus: Dict[str, List[str]]) -> None:
        """Builds all 4 weighting models across Doc-Term, Term-Doc, and Posting Lists."""
        self.doc_ids = sorted(processed_corpus.keys(), key=doc_id_sort_key)
        if not self.doc_ids:
            return

        raw_counts = self._count_corpus_terms(processed_corpus)
        idf_scores = self._compute_idf_scores()
        self.init_model_structures()

        # Iterate documents in sorted ID order so posting lists stay naturally sorted
        for doc_id in self.doc_ids:
            max_tf = self.doc_max_tf.get(doc_id, 1)
            for term, count in raw_counts[doc_id].items():
                weights = self.compute_weights(count, max_tf, idf_scores[term])
                for model_key, weight in weights.items():
                    self.set_weight(model_key, doc_id, term, weight)
                    if weight > 0:
                        self.models[model_key].inverted_index[term].append((doc_id, weight))

    def get_matrix_slice(
        self,
        model_name: str,
        matrix_type: str = "doc_term",
        page: int = 1,
        page_size: int = 15,
        term_filter: str = "",
    ) -> Dict[str, Any]:
        """Returns a paginated slice of the Document-Term or Term-Document matrix."""
        key = model_name if model_name in self.models else "tfidf"
        model = self.models[key]
        filtered_terms = (
            [t for t in self.vocabulary if term_filter.lower() in t.lower()]
            if term_filter
            else self.vocabulary
        )

        if matrix_type == "doc_term":
            columns = filtered_terms[:20]
            rows = [
                {
                    "row_id": doc_id,
                    "weights": {t: model.doc_term.get(doc_id, {}).get(t, 0.0) for t in columns},
                }
                for doc_id in paginate(self.doc_ids, page, page_size)
            ]
            total_rows = len(self.doc_ids)
        else:
            columns = self.doc_ids[:20]
            rows = [
                {
                    "row_id": term,
                    "df": self.term_doc_freq.get(term, 0),
                    "weights": {d: model.term_doc.get(term, {}).get(d, 0.0) for d in columns},
                }
                for term in paginate(filtered_terms, page, page_size)
            ]
            total_rows = len(filtered_terms)

        return {
            "matrix_type": "doc_term" if matrix_type == "doc_term" else "term_doc",
            "model": key,
            "columns": columns,
            "rows": rows,
            "total_rows": total_rows,
            "page": page,
            "page_size": page_size,
        }

    def get_postings(
        self,
        model_name: str,
        query: str = "",
        page: int = 1,
        page_size: int = 20,
    ) -> Dict[str, Any]:
        """Returns paginated Inverted Lists (Posting Lists) with optional substring search."""
        key = model_name if model_name in self.models else "tfidf"
        model = self.models[key]

        q = query.lower().strip()
        matching_terms = [t for t in self.vocabulary if q in t] if q else self.vocabulary

        items = []
        for term in paginate(matching_terms, page, page_size):
            postings = model.inverted_index.get(term, [])
            items.append({
                "term": term,
                "df": self.term_doc_freq.get(term, 0),
                "posting_count": len(postings),
                "postings": postings[:30],
                "has_more": len(postings) > 30,
            })

        return {
            "model": key,
            "query": query,
            "total_terms": len(matching_terms),
            "page": page,
            "page_size": page_size,
            "items": items,
        }
