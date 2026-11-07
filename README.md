# ReutersIR Studio — Intelligent Search Engine (Phase 1: Admin Module)

An end-to-end Information Retrieval (IR) indexing studio built **100% from scratch** for the **Reuters-21578** collection.  
Engineered with a clean, decoupled architecture: a **FastAPI** backend with transparent IR/NLP algorithms and a **React + Vite + Tailwind CSS** interactive workspace.

---

## Key Features

- **100% From-Scratch NLP Engine**: Zero external NLP or markup parsing libraries (`no NLTK`, `no spaCy`, `no BeautifulSoup`, `no regex re`). Every stage is implemented with standard Python data structures for complete algorithmic transparency.
- **Dynamic & Reorderable NLP Pipeline**: Enable, disable, and reorder any of the 5 preprocessing stages with live intermediate token tracing.
- **Multi-Model Vectorizer (4 Weighting Models)**:
  1. **BoW (Binary)**: $w(t, d) \in \{0, 1\}$
  2. **F (Raw Frequency)**: $w(t, d) = f(t, d)$
  3. **TF (Normalized Term Frequency)**: $w(t, d) = \frac{f(t, d)}{\max_{t' \in d} f(t', d)}$
  4. **TF-IDF**: $w(t, d) = \text{TF}(t, d) \times \log_{10}\!\left(1 + \frac{N}{df(t)}\right)$
- **3 Physical Index Representations per Model**:
  - **Document-Term Matrix** ($D \times V$: rows = documents, columns = vocabulary terms)
  - **Term-Document Matrix** ($V \times D$: rows = vocabulary terms, columns = documents)
  - **Inverted Posting Lists** ($t \mapsto [(doc\_id, weight), \dots]$, omitting zero entries)
- **Deep Recursive RAM Profiler**: Traverses nested Python structures via `sys.getsizeof` with object-ID deduplication to measure exact memory savings of sparse inverted lists over dense matrices.
- **Checkpoint Serialization & Registry**: Exports, imports, downloads, and restores indexes on disk in portable `.json` and fast binary `.pkl` formats.

---

## Repository Structure

```text
projet/
├── backend/                             # Python 3.10+ / FastAPI Backend
│   ├── core/                            # From-Scratch IR & NLP Algorithms
│   │   ├── parser.py                    # Reuters-21578 SGML & plain-text parser
│   │   ├── nlp_steps.py                 # Tag cleaning, normalisation, stopwords, stemmer, lemmatizer
│   │   ├── pipeline.py                  # Dynamic reorderable pipeline & step-by-step tracer
│   │   ├── indexer.py                   # Multi-model indexer (4 models x 3 structures)
│   │   ├── memory_monitor.py            # Recursive RAM profiler (deep sys.getsizeof)
│   │   └── storage.py                   # Disk serialization (.json & .pkl checkpoints)
│   │
│   ├── api/                             # Modular FastAPI Routers
│   │   ├── routes_dataset.py            # /api/dataset  (sample loader, file upload, doc viewer)
│   │   ├── routes_pipeline.py           # /api/pipeline (available steps, live trace preview)
│   │   ├── routes_index.py              # /api/index    (build, RAM metrics, matrices, postings)
│   │   └── routes_export.py             # /api/export   (save, list, restore, download, upload, delete)
│   │
│   ├── data/
│   │   ├── samples/reuters_sample.sgm   # Built-in 20-document Reuters-21578 benchmark
│   │   └── saved_indexes/               # Persisted index checkpoints (.json / .pkl)
│   │
│   ├── tests/
│   │   └── test_engine.py               # Automated unit & REST API test suite
│   ├── state.py                         # Centralized in-memory application state
│   ├── main.py                          # FastAPI entrypoint & startup lifespan hook
│   └── requirements.txt                 # Minimal Python dependencies
│
├── frontend/                            # React 19 + Vite + Tailwind CSS v4 Studio
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx               # Corpus telemetry & 5-stage workflow navigation
│   │   │   ├── DatasetSection.jsx       # Drag-and-drop uploader & split-pane corpus viewer
│   │   │   ├── PipelineSection.jsx      # Reorderable NLP stages & live dry-run playground
│   │   │   ├── MetricsSection.jsx       # KPI cards & dense-vs-sparse RAM comparison charts
│   │   │   ├── IndexExplorer.jsx        # Weighting model tabs, heatmaps & posting lists
│   │   │   ├── ExportSection.jsx        # Checkpoint save, restore, upload & download registry
│   │   │   ├── DocumentQuickPeek.jsx    # Slide-over document reader with term highlighting
│   │   │   └── ToastContainer.jsx       # Floating status notifications
│   │   ├── services/api.js              # Typed fetch client for backend REST endpoints
│   │   ├── App.jsx                      # Main studio orchestrator
│   │   └── index.css                    # Editorial light theme & utility styles
│   ├── package.json
│   └── vite.config.js
│
├── scripts/
│   ├── run_backend.bat                  # Standalone backend launcher (port 8000)
│   └── run_frontend.bat                 # Standalone frontend launcher (port 5173)
├── run_all.bat                          # 1-Click Full-Stack launcher (Windows)
└── README.md
```

---

## Quickstart

### Prerequisites
- **Python** 3.10+
- **Node.js** 18+ and `npm`

### 1. Install Dependencies

```bash
# Backend dependencies
cd backend
pip install -r requirements.txt

# Frontend dependencies
cd ../frontend
npm install
```

### 2. Run the Application

**Option A — One-Click Windows Launcher:**  
Double-click `run_all.bat` at the repository root to start both servers automatically.

**Option B — Manual Terminal Commands:**

```bash
# Terminal 1: FastAPI Backend (http://127.0.0.1:8000 | Swagger Docs: /docs)
cd backend
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload

# Terminal 2: React Frontend (http://localhost:5173)
cd frontend
npm run dev
```

### 3. Run Automated Tests & Linter

```bash
# Backend unit + API tests (from repository root)
python -m unittest discover -s backend/tests -v

# Frontend static analysis
cd frontend && npm run lint
```

---

## Backend Architecture & Oral Defense Guide

Every backend module in `backend/core/` is written with short, single-responsibility functions designed for clear walkthroughs during code defense:

### 1. Corpus Parsing (`backend/core/parser.py`)
- `decode_sgml_entities(text)`: Replaces SGML character entities (`&amp;`, `&lt;`, `&gt;`, `&#2;`, `&#3;`) via a lookup dictionary.
- `extract_tag_content(text, tag_name, start_pos)`: Case-insensitively locates `<TAG>...</TAG>` slices using `str.find` without external XML/HTML parsers.
- `parse_reuters_sgml(content)`: Iterates `<REUTERS>...</REUTERS>` blocks and delegates each block to `_parse_reuters_block` to extract `NEWID`, `TITLE`, `BODY` (with `<TEXT>` fallback), and `<TOPICS><D>`.

### 2. From-Scratch NLP Operations (`backend/core/nlp_steps.py`)
- `clean_tags(text)`: Character-by-character state machine (`inside_tag` flag) that drops `<...>` markup, inserts spaces to prevent word concatenation, and decodes SGML entities.
- `normalize_text(text)` & `tokenize(text)`: Lowercases characters, replaces ASCII/typographic punctuation with spaces, collapses whitespace, and keeps alphanumeric tokens.
- `remove_stopwords(tokens)`: Filters ~160 English functional words in $O(1)$ average time per token using a Python `set`.
- `stem_word(word)`: Modular Porter-style suffix stripper using `_measure(word)` (counting $VC$ transitions in $[C](VC)^m[V]$), `_cleanup_ed_ing_stem`, and `_apply_suffix_rules` across plural, participle, and derivational suffixes.
- `lemmatize_word(word)`: Combines an $O(1)$ `IRREGULAR_LEMMAS` dictionary (`bought` $\to$ `buy`, `matrices` $\to$ `matrix`, `went` $\to$ `go`) with morphological rules (`-ies` $\to$ `-y`, `-ves` $\to$ `-f/-fe`, sibilant `-es`, `-ing`, `-ed`).

### 3. Dynamic Pipeline (`backend/core/pipeline.py`)
- `DynamicNLPPipeline.process(text)`: Applies user-selected steps in arbitrary order, seamlessly handling transitions between raw `str` and `List[str]` token lists.
- `DynamicNLPPipeline.trace(text)`: Records intermediate outputs after each step to power the UI live dry-run playground.

### 4. Multi-Model Indexer (`backend/core/indexer.py`)
- `MultiModelIndex._count_corpus_terms(corpus)`: Single pass computing raw counts $f(t, d)$, per-document $\max_{t'} f(t', d)$, sorted vocabulary $V$, and document frequencies $df(t)$.
- `MultiModelIndex._compute_idf_scores()`: Computes $\text{IDF}(t) = \log_{10}(1 + N / df(t))$.
- `MultiModelIndex.compute_weights(raw_count, max_tf, idf_score)`: Computes all 4 model weights (`bow`, `f`, `tf`, `tfidf`) in 6 lines.
- `MultiModelIndex.build(corpus)`: Populates dense `doc_term` ($D \times V$) and `term_doc` ($V \times D$) matrices alongside sparse sorted `inverted_index` posting lists.

### 5. Deep RAM Monitoring (`backend/core/memory_monitor.py`)
- `deep_getsizeof(obj, seen)`: Standard `sys.getsizeof(dict)` only measures top-level bucket pointers. `deep_getsizeof` recursively sums keys, values, lists, tuples, and floats while tracking `id(obj)` in `seen` to avoid double-counting shared references.

### 6. Disk Persistence (`backend/core/storage.py`)
- `save_index_to_disk` & `load_index_from_disk`: Saves human-readable `.json` checkpoints (vocabulary, $df$, pipeline steps, and inverted lists for all 4 models) alongside `.pkl` snapshots, with automatic JSON reconstruction via `index_from_json_dict` for Phase 2 search readiness.

---

## REST API Overview

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Readiness check, active corpus name, and index status |
| `GET` | `/api/dataset/sample` | Load built-in 20-document Reuters-21578 SGML sample |
| `POST` | `/api/dataset/upload` | Upload and parse `.sgm`, `.xml`, or `.txt` corpus file |
| `GET` | `/api/dataset/documents` | Paginated list of parsed documents |
| `GET` | `/api/dataset/documents/{doc_id}` | Full text and topic labels for a single document |
| `GET` | `/api/pipeline/steps` | List available NLP stages and active step sequence |
| `POST` | `/api/pipeline/preview` | Trace step-by-step NLP transformations on sample text |
| `POST` | `/api/index/generate` | Run pipeline on corpus, build 4 models, and profile RAM |
| `GET` | `/api/index/metrics` | Retrieve vocabulary size and RAM savings breakdown |
| `GET` | `/api/index/matrix` | Paginated `doc_term` or `term_doc` matrix slice |
| `GET` | `/api/index/postings` | Paginated inverted posting lists with term search |
| `POST` | `/api/export/save` | Serialize active index to `.json` and `.pkl` on disk |
| `GET` | `/api/export/saved-list` | List saved index checkpoints on disk |
| `POST` | `/api/export/load` | Restore a saved checkpoint into active memory |
| `GET` | `/api/export/download/{filename}` | Download checkpoint file (`.json` or `.pkl`) |
| `POST` | `/api/export/upload` | Import and validate an external `.json` checkpoint |
| `DELETE` | `/api/export/saved/{filename}` | Delete a saved checkpoint from disk |
