import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

from core.parser import parse_document_file
from core.pipeline import DynamicNLPPipeline
from core.indexer import MultiModelIndex
from core.memory_monitor import compute_index_metrics
from core.storage import save_index_to_disk, list_saved_indexes

def main():
    sample_path = os.path.join(os.path.dirname(__file__), "data", "samples", "reuters_sample.sgm")
    with open(sample_path, "r", encoding="utf-8") as f:
        content = f.read()

    docs = parse_document_file(content, "reuters_sample.sgm")
    print(f"[OK] Parsed {len(docs)} documents.")
    print(f"     Doc #1: '{docs[0].title}'")

    pipeline = DynamicNLPPipeline(["tag_cleaning", "normalisation", "stopwords_removal", "stemming"])
    corpus = {d.doc_id: pipeline.process(d.full_text) for d in docs}
    
    index = MultiModelIndex()
    index.build(corpus)
    print(f"[OK] Built MultiModelIndex. Vocab size: {index.vocabulary_size} terms across {index.num_documents} docs.")

    metrics = compute_index_metrics(index)
    print(f"[OK] Metrics computed:")
    print(f"     Matrix RAM: {metrics['total_matrices_formatted']}")
    print(f"     Inverted List RAM: {metrics['total_inverted_formatted']}")
    print(f"     Savings: {metrics['global_savings_percent']}%")

    res = save_index_to_disk(index, pipeline.step_order, "initial_test_index")
    print(f"[OK] Saved to disk: {res['json_file']}")

    saved = list_saved_indexes()
    print(f"[OK] Listed saved checkpoints: {len(saved)} found.")

if __name__ == "__main__":
    main()

