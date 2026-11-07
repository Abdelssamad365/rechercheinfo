"""Automated unit and API tests for the from-scratch Information Retrieval engine.

Run from repository root:
    python -m unittest discover -s backend/tests -v
"""

import math
import os
import sys
import tempfile
import unittest

# Ensure `backend/` is importable regardless of working directory
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from fastapi.testclient import TestClient
from core.indexer import MultiModelIndex
from core.memory_monitor import compute_index_metrics
from core.nlp_steps import (
    clean_tags,
    lemmatize_word,
    normalize_text,
    remove_stopwords,
    stem_word,
    tokenize,
)
from core.parser import parse_document_file, parse_raw_text, parse_reuters_sgml
from core.pipeline import DynamicNLPPipeline
from core.storage import (
    delete_saved_index,
    import_index_from_json_bytes,
    list_saved_indexes,
    load_index_from_disk,
    save_index_to_disk,
)
from main import app


class TestCoreEngine(unittest.TestCase):
    """Verifies each from-scratch IR component in isolation."""

    def test_sgml_and_raw_text_parsing(self):
        sgml = (
            '<REUTERS NEWID="42">'
            "<TOPICS><D>cocoa</D><D>trade</D></TOPICS>"
            "<TITLE>U.S. &amp; BRAZIL TRADE</TITLE>"
            "<BODY>&#2;Exports rose sharply.&#3;</BODY>"
            "</REUTERS>"
        )
        docs = parse_reuters_sgml(sgml)
        self.assertEqual(len(docs), 1)
        self.assertEqual(docs[0].doc_id, "42")
        self.assertEqual(docs[0].title, "U.S. & BRAZIL TRADE")
        self.assertEqual(docs[0].body, "Exports rose sharply.")
        self.assertEqual(docs[0].topics, ["cocoa", "trade"])

        raw_docs = parse_raw_text("First Title\nFirst body.\n\nSecond paragraph.", "notes.txt")
        self.assertEqual(len(raw_docs), 2)
        self.assertEqual(parse_document_file(sgml, "sample.sgm")[0].doc_id, "42")

    def test_nlp_steps_from_scratch(self):
        cleaned = clean_tags("<TITLE>U.S. &amp; GRAIN</TITLE><BODY>Prices rose!</BODY>")
        self.assertEqual(cleaned, "U.S. & GRAIN Prices rose!")

        tokens = tokenize(normalize_text(cleaned))
        self.assertEqual(tokens, ["u", "s", "grain", "prices", "rose"])

        filtered = remove_stopwords(["the", "cocoa", "is", "exported"])
        self.assertEqual(filtered, ["cocoa", "exported"])

        self.assertEqual(stem_word("caresses"), "caress")
        self.assertEqual(stem_word("ponies"), "poni")
        self.assertEqual(stem_word("exporting"), "export")

        self.assertEqual(lemmatize_word("bought"), "buy")
        self.assertEqual(lemmatize_word("matrices"), "matrix")
        self.assertEqual(lemmatize_word("companies"), "company")

    def test_dynamic_pipeline_order_and_trace(self):
        sample = "<BODY>The Banks bought Cocoa!</BODY>"

        standard = DynamicNLPPipeline(
            ["tag_cleaning", "normalisation", "stopwords_removal", "lemmatization"]
        )
        self.assertEqual(standard.process(sample), ["bank", "buy", "cocoa"])

        # Disabling normalisation keeps uppercase and punctuation intact
        unnormalized = DynamicNLPPipeline(["tag_cleaning"])
        self.assertEqual(unnormalized.process(sample), ["The", "Banks", "bought", "Cocoa!"])

        trace = standard.trace(sample)
        self.assertEqual(len(trace), 5)  # Input + 4 stages

    def test_multi_model_weights_and_ram_savings(self):
        corpus = {
            "1": ["cocoa", "cocoa", "bank"],
            "2": ["bank", "oil"],
        }
        index = MultiModelIndex()
        index.build(corpus)

        self.assertEqual(index.num_documents, 2)
        self.assertEqual(index.vocabulary, ["bank", "cocoa", "oil"])

        # In doc 1: count("cocoa") = 2, max_tf = 2 -> TF = 1.0; DF("cocoa") = 1 -> IDF = log10(1 + 2/1)
        expected_tfidf = round(1.0 * math.log10(1.0 + 2.0 / 1.0), 4)
        self.assertEqual(index.models["bow"].doc_term["1"]["cocoa"], 1.0)
        self.assertEqual(index.models["f"].doc_term["1"]["cocoa"], 2.0)
        self.assertEqual(index.models["tf"].doc_term["1"]["cocoa"], 1.0)
        self.assertEqual(index.models["tfidf"].doc_term["1"]["cocoa"], expected_tfidf)
        self.assertEqual(index.models["tfidf"].inverted_index["cocoa"], [("1", expected_tfidf)])

        # Verify RAM benchmark on the 20-document Reuters sample
        sample_path = os.path.join(BACKEND_DIR, "data", "samples", "reuters_sample.sgm")
        with open(sample_path, "r", encoding="utf-8") as f:
            docs = parse_document_file(f.read(), "reuters_sample.sgm")
        pipeline = DynamicNLPPipeline()
        sample_index = MultiModelIndex()
        sample_index.build({d.doc_id: pipeline.process(d.full_text) for d in docs})

        metrics = compute_index_metrics(sample_index)
        self.assertGreater(metrics["total_matrices_bytes"], metrics["total_inverted_bytes"])
        self.assertGreater(metrics["global_savings_percent"], 0)

    def test_storage_persistence_lifecycle(self):
        index = MultiModelIndex()
        index.build({"1": ["cocoa", "trade"], "2": ["oil"]})
        steps = ["tag_cleaning", "normalisation"]

        with tempfile.TemporaryDirectory() as tmp_dir:
            saved = save_index_to_disk(index, steps, name="unit_test_idx", save_dir=tmp_dir)
            self.assertEqual(saved["name"], "unit_test_idx")
            self.assertEqual(len(list_saved_indexes(tmp_dir)), 1)

            # Test binary (.pkl) reload and JSON-only fallback reload
            loaded_pkl, meta_pkl = load_index_from_disk("unit_test_idx", save_dir=tmp_dir)
            self.assertIsNotNone(loaded_pkl)
            self.assertEqual(meta_pkl["pipeline_steps"], steps)

            os.remove(os.path.join(tmp_dir, "unit_test_idx.pkl"))
            loaded_json, _ = load_index_from_disk("unit_test_idx", save_dir=tmp_dir)
            self.assertEqual(loaded_json.vocabulary, ["cocoa", "oil", "trade"])

            with open(saved["json_path"], "rb") as jf:
                imported = import_index_from_json_bytes(jf.read(), "copy_idx.json", save_dir=tmp_dir)
            self.assertEqual(imported["name"], "copy_idx")

            self.assertTrue(delete_saved_index("unit_test_idx", save_dir=tmp_dir))


class TestAPIEndpoints(unittest.TestCase):
    """Verifies FastAPI REST routes end-to-end."""

    def test_full_api_workflow(self):
        with TestClient(app) as client:
            health = client.get("/api/health")
            self.assertEqual(health.status_code, 200)
            self.assertEqual(health.json()["num_documents"], 20)

            preview = client.post(
                "/api/pipeline/preview",
                json={"text": "<TITLE>Cocoa &amp; Banks</TITLE>", "step_order": ["tag_cleaning", "normalisation"]},
            )
            self.assertEqual(preview.status_code, 200)
            self.assertEqual(preview.json()["final_tokens"], ["cocoa", "banks"])

            gen = client.post(
                "/api/index/generate",
                json={"step_order": ["tag_cleaning", "normalisation", "stopwords_removal", "stemming"]},
            )
            self.assertEqual(gen.status_code, 200)
            self.assertGreater(gen.json()["vocabulary_size"], 100)

            matrix = client.get("/api/index/matrix?model=tfidf&matrix_type=doc_term&page=1&page_size=5")
            self.assertEqual(matrix.status_code, 200)
            self.assertEqual(len(matrix.json()["rows"]), 5)

            postings = client.get("/api/index/postings?model=tfidf&query=cocoa")
            self.assertEqual(postings.status_code, 200)
            self.assertGreaterEqual(postings.json()["total_terms"], 1)


if __name__ == "__main__":
    unittest.main()

