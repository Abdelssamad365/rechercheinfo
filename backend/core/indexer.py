"""Multi-Model Indexing Engine for Information Retrieval.
Implements 4 weighting models across 3 representations (Doc-Term, Term-Doc, Inverted Lists).
All algorithms are implemented from scratch using Python standard libraries (math).
"""

import math
from typing import Any, Dict, List, Set, Tuple
from .parser import Document


class ModelIndexData:
    """Holds the 3 output formats for a single weighting model."""
    def __init__(self, name: str):
        self.name = name
        # Document-Term Matrix: Rows = Docs, Columns = Terms
        self.doc_term: Dict[str, Dict[str, float]] = {}
        # Term-Document Matrix: Rows = Terms, Columns = Docs
        self.term_doc: Dict[str, Dict[str, float]] = {}
        # Inverted Index: Term -> [(DocID, Weight), ...]
        self.inverted_index: Dict[str, List[Tuple[str, float]]] = {}


class MultiModelIndex:
    """
    Generates and stores all 4 weighting models:
    - BoW (Binary): 1 if present, 0 if absent
    - F (Raw Frequency): raw term occurrence count
    - TF (Normalized Term Frequency): tf / max_tf in document
    - TF-IDF: TF * IDF
    
    Each model is represented in 3 formats:
    1. Document-Term Matrix (Docs x Terms)
    2. Term-Document Matrix (Terms x Docs)
    3. Inverted List / Posting Lists
    """

    def __init__(self):
        self.doc_ids: List[str] = []
        self.vocabulary: List[str] = []
        self.term_doc_freq: Dict[str, int] = {}  # DF: number of docs containing term
        self.doc_lengths: Dict[str, int] = {}    # Total token count per doc
        self.doc_max_tf: Dict[str, int] = {}     # Max raw term frequency per doc

        # The 4 models
        self.models: Dict[str, ModelIndexData] = {
            "bow": ModelIndexData("Bag of Words (Binary)"),
            "f": ModelIndexData("Raw Frequency (F)"),
            "tf": ModelIndexData("Normalized Term Frequency (TF)"),
            "tfidf": ModelIndexData("TF-IDF")
        }

    @property
    def num_documents(self) -> int:
        return len(self.doc_ids)

    @property
    def vocabulary_size(self) -> int:
        return len(self.vocabulary)

    def build(self, processed_corpus: Dict[str, List[str]]):
        """
        Builds all 4 models and their 3 representation formats from scratch.
        processed_corpus: {doc_id: [token1, token2, ...]}
        """
        self.doc_ids = sorted(list(processed_corpus.keys()), key=lambda x: int(x) if x.isdigit() else x)
        num_docs = len(self.doc_ids)
        if num_docs == 0:
            return

        # 1. First pass: count raw term frequencies per document
        # raw_counts[doc_id][term] = count
        raw_counts: Dict[str, Dict[str, int]] = {}
        vocab_set: Set[str] = set()

        for doc_id, tokens in processed_corpus.items():
            counts: Dict[str, int] = {}
            for t in tokens:
                counts[t] = counts.get(t, 0) + 1
                vocab_set.add(t)
            
            raw_counts[doc_id] = counts
            self.doc_lengths[doc_id] = len(tokens)
            self.doc_max_tf[doc_id] = max(counts.values()) if counts else 1

        # Alphabetically sorted vocabulary
        self.vocabulary = sorted(list(vocab_set))

        # 2. Document Frequency DF(t): count how many documents contain term t
        self.term_doc_freq = {t: 0 for t in self.vocabulary}
        for doc_id, counts in raw_counts.items():
            for t in counts:
                self.term_doc_freq[t] += 1

        # 3. Compute IDF(t) for all terms
        # Formula: IDF(t) = log10(1 + N / DF(t))
        idf: Dict[str, float] = {}
        for t, df in self.term_doc_freq.items():
            if df > 0:
                idf[t] = math.log10(1.0 + (float(num_docs) / float(df)))
            else:
                idf[t] = 0.0

        # 4. Initialize structures for all 4 models
        for m in self.models.values():
            m.doc_term = {doc_id: {} for doc_id in self.doc_ids}
            m.term_doc = {t: {} for t in self.vocabulary}
            m.inverted_index = {t: [] for t in self.vocabulary}

        # 5. Populate weights
        for doc_id in self.doc_ids:
            counts = raw_counts.get(doc_id, {})
            max_tf = self.doc_max_tf.get(doc_id, 1) or 1

            for term, count in counts.items():
                # Model 1: BoW (Binary)
                val_bow = 1.0

                # Model 2: Raw Frequency (F)
                val_f = float(count)

                # Model 3: Normalized TF (tf / max_tf)
                val_tf = round(float(count) / float(max_tf), 4)

                # Model 4: TF-IDF (TF * IDF)
                val_tfidf = round(val_tf * idf.get(term, 0.0), 4)

                # Populate BoW
                self._set_weight("bow", doc_id, term, val_bow)
                # Populate F
                self._set_weight("f", doc_id, term, val_f)
                # Populate TF
                self._set_weight("tf", doc_id, term, val_tf)
                # Populate TF-IDF
                self._set_weight("tfidf", doc_id, term, val_tfidf)

        # 6. Build Inverted Lists from Term-Doc entries (sorted by doc_id)
        for model_key, model_data in self.models.items():
            for term, doc_dict in model_data.term_doc.items():
                postings = [(doc_id, weight) for doc_id, weight in doc_dict.items() if weight > 0]
                # Sort postings by document ID
                postings.sort(key=lambda item: int(item[0]) if item[0].isdigit() else item[0])
                model_data.inverted_index[term] = postings

    def _set_weight(self, model_key: str, doc_id: str, term: str, weight: float):
        """Helper to populate both Doc-Term and Term-Doc matrices."""
        self.models[model_key].doc_term[doc_id][term] = weight
        self.models[model_key].term_doc[term][doc_id] = weight

    def get_matrix_slice(
        self,
        model_name: str,
        matrix_type: str = "doc_term",
        page: int = 1,
        page_size: int = 15,
        term_filter: str = ""
    ) -> Dict[str, Any]:
        """
        Returns a paginated slice of the requested matrix for UI display.
        matrix_type: 'doc_term' (Docs x Terms) or 'term_doc' (Terms x Docs).
        """
        if model_name not in self.models:
            model_name = "tfidf"

        model = self.models[model_name]
        terms = [t for t in self.vocabulary if term_filter.lower() in t.lower()] if term_filter else self.vocabulary

        if matrix_type == "doc_term":
            # Rows = Documents, Columns = Terms
            total_rows = len(self.doc_ids)
            start = (page - 1) * page_size
            end = start + page_size
            sliced_docs = self.doc_ids[start:end]
            
            # Select first 20 terms for column display in the slice
            cols = terms[:20]

            rows_data = []
            for doc_id in sliced_docs:
                row_weights = {
                    t: model.doc_term.get(doc_id, {}).get(t, 0.0)
                    for t in cols
                }
                rows_data.append({
                    "row_id": doc_id,
                    "weights": row_weights
                })

            return {
                "matrix_type": "doc_term",
                "model": model_name,
                "columns": cols,
                "rows": rows_data,
                "total_rows": total_rows,
                "page": page,
                "page_size": page_size
            }

        else:
            # Term-Document Matrix: Rows = Terms, Columns = Docs
            total_rows = len(terms)
            start = (page - 1) * page_size
            end = start + page_size
            sliced_terms = terms[start:end]

            # Select first 20 docs for column display
            cols = self.doc_ids[:20]

            rows_data = []
            for term in sliced_terms:
                row_weights = {
                    doc_id: model.term_doc.get(term, {}).get(doc_id, 0.0)
                    for doc_id in cols
                }
                rows_data.append({
                    "row_id": term,
                    "df": self.term_doc_freq.get(term, 0),
                    "weights": row_weights
                })

            return {
                "matrix_type": "term_doc",
                "model": model_name,
                "columns": cols,
                "rows": rows_data,
                "total_rows": total_rows,
                "page": page,
                "page_size": page_size
            }

    def get_postings(
        self,
        model_name: str,
        query: str = "",
        page: int = 1,
        page_size: int = 20
    ) -> Dict[str, Any]:
        """
        Returns paginated posting lists for terms, supporting search filtering.
        """
        if model_name not in self.models:
            model_name = "tfidf"

        model = self.models[model_name]
        terms = self.vocabulary

        if query:
            q = query.lower().strip()
            terms = [t for t in terms if q in t]

        total_terms = len(terms)
        start = (page - 1) * page_size
        end = start + page_size
        sliced_terms = terms[start:end]

        results = []
        for term in sliced_terms:
            postings = model.inverted_index.get(term, [])
            results.append({
                "term": term,
                "df": self.term_doc_freq.get(term, 0),
                "posting_count": len(postings),
                "postings": postings[:30],  # Return first 30 postings for fast rendering
                "has_more": len(postings) > 30
            })

        return {
            "model": model_name,
            "query": query,
            "total_terms": total_terms,
            "page": page,
            "page_size": page_size,
            "items": results
        }

