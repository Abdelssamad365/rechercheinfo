# Intelligent Search Engine — Phase 1: Module Administrateur

An end-to-end intelligent search engine built from scratch for the **Reuters-21578** collection.
Designed with a modular, decoupled architecture: **FastAPI** backend and a modern, premium **React + Tailwind CSS** frontend.

---

## 🌟 Highlights & Academic Defense Strengths

* **100% "From Scratch" NLP Engine**: Zero reliance on external NLP packages (`NLTK`, `spaCy`, or `BeautifulSoup`). All tag cleaning, normalisation, tokenization, stopword filtering, stemming, and lemmatization are handcrafted to qualify for maximum bonus points.
* **Fully Dynamic Pipeline**: Toggle steps on/off and **customize their exact execution sequence order** with interactive reordering controls.
* **Live Dry-Run Playground**: Type any sample phrase and watch the step-by-step transformations in real time on the UI.
* **Multi-Model Indexing**: Computes all 4 models simultaneously:
  1. **BoW (Bag of Words / Binary)**: Presence (1) or Absence (0).
  2. **F (Frequency)**: Raw term frequency.
  3. **TF (Normalized Term Frequency)**: $tf(t, d) / \max_{t' \in d} tf(t', d)$.
  4. **TF-IDF**: $TF \times IDF$, where $IDF(t) = \log_{10}(1 + N / DF(t))$.
* **Dual Physical Representations**:
  - **Document-Term Matrix** (Rows = Documents, Columns = Terms)
  - **Term-Document Matrix** (Rows = Terms, Columns = Documents)
  - **Inverted Lists (Posting Lists)** with term search and pagination
* **Deep In-Memory RAM Monitoring**: Accurately computes true memory footprints using recursive `sys.getsizeof` traversing nested structures, visually demonstrating why Inverted Lists save memory compared to dense matrices.
* **Disk Serialization & Persistence**: Saves indexes as human-readable `.json` and high-speed binary `.pkl` files in `backend/data/saved_indexes/`, ready for Phase 2 client search.

---

## 📁 Project Architecture

```text
projet/
├── backend/                             # Python 3.10+ / FastAPI Backend
│   ├── core/                            # 100% From-Scratch IR Algorithms
│   │   ├── parser.py                    # Reuters SGML / XML char-by-char state machine
│   │   ├── nlp_steps.py                 # Handcrafted NLP steps (Tag, Norm, Stopwords, Stem, Lemma)
│   │   ├── pipeline.py                  # Dynamic reorderable pipeline execution engine
│   │   ├── indexer.py                   # Multi-Model Indexer (BoW, F, TF, TF-IDF in 3 formats)
│   │   ├── memory_monitor.py            # Deep RAM calculator (sys.getsizeof recursive)
│   │   └── storage.py                   # Disk serialization (JSON & Pickle)
│   │
│   ├── api/                             # REST API Endpoints
│   │   ├── routes_dataset.py            # /api/dataset (Upload, sample loader, doc viewer)
│   │   ├── routes_pipeline.py           # /api/pipeline (Steps, live dry-run trace)
│   │   ├── routes_index.py              # /api/index (Generate, metrics, matrices, postings)
│   │   └── routes_export.py             # /api/export (Save to disk, load checkpoints)
│   │
│   ├── data/
│   │   ├── samples/                     # Built-in Reuters-21578 sample SGML
│   │   └── saved_indexes/               # Serialized index files
│   ├── main.py                          # FastAPI application entrypoint
│   └── requirements.txt
│
├── frontend/                            # Modern React + Vite + Tailwind CSS Frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx               # Brand, active corpus pill, Phase 2 badge
│   │   │   ├── DatasetSection.jsx       # File uploader, sample loader, doc viewer
│   │   │   ├── PipelineSection.jsx      # Reorderable pipeline & live playground
│   │   │   ├── MetricsSection.jsx       # KPI cards, RAM comparison chart
│   │   │   ├── IndexExplorer.jsx        # Model tabs & matrix/postings viewer
│   │   │   └── ExportSection.jsx        # Save/Load index checkpoints on disk
│   │   ├── services/
│   │   │   └── api.js                   # API client service
│   │   ├── App.jsx                      # Main dashboard orchestrator
│   │   └── index.css                    # Tailwind CSS + custom dark styling
│   ├── package.json
│   └── vite.config.js
│
├── run_backend.bat                      # 1-Click Backend launcher (port 8000)
├── run_frontend.bat                     # 1-Click Frontend launcher (port 5173)
├── run_all.bat                          # 1-Click Full Stack launcher
└── README.md
```

---

## 🚀 Quickstart Guide

### Prerequisites
- Python 3.10+
- Node.js 18+ & npm

### Method 1: One-Click Launch (Windows)
Double-click `run_all.bat`. It will open two console windows and start both services.

Then open your browser at:
👉 **`http://localhost:5173`**

---

### Method 2: Manual Terminal Commands

#### 1. Start FastAPI Backend:
```bash
cd backend
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```
*API Swagger Documentation will be available at: `http://127.0.0.1:8000/docs`*

#### 2. Start React Frontend:
```bash
cd frontend
npm run dev
```
*Dashboard will open at: `http://localhost:5173`*

---

## 🎓 Oral Defense (Face-to-Face) Cheat-Sheet

During your oral defense, professors may ask how specific algorithms are implemented without third-party libraries. Here is how each component works:

### 1. SGML Tag Cleaning (`core/parser.py` & `core/nlp_steps.py`)
- **How it works**: A character-by-character scanner checks whether the current character is inside `<` and `>`. If inside, characters are dropped; if outside, they are retained.
- **Entity decoding**: Converts SGML entities (`&lt;` $\to$ `<`, `&gt;` $\to$ `>`, `&amp;` $\to$ `&`, `&#2;` $\to$ `""`) manually via replacement dictionaries.

### 2. Normalisation (`core/nlp_steps.py`)
- **How it works**: Converts text to lowercase with `char.lower()`. Punctuation characters are matched against an ASCII punctuation set and replaced with spaces, preventing punctuation concatenation without regular expressions. Words are then split on whitespace.

### 3. Stopwords Removal (`core/nlp_steps.py`)
- **How it works**: Uses a curated Python hash set (`set[str]`) containing ~160 standard English functional words (`in`, `on`, `the`, `is`, `for`, `which`, etc.). Lookup is performed in $O(1)$ time per token.

### 4. Stemmer (`core/nlp_steps.py`)
- **How it works**: Handcrafted implementation of a transparent Porter suffix-stripping engine:
  - Step 1: Plurals and participle suffixes (`-sses` $\to$ `-ss`, `-ies` $\to$ `-y`, `-s` $\to$ `""`, `-eed` $\to$ `-ee`, `-ed` $\to$ `""`, `-ing` $\to$ `""`).
  - Step 2: Derivational suffixes (`-ational` $\to$ `-ate`, `-ization` $\to$ `-ize`, `-fulness` $\to$ `-ful`).
  - Measures consonant-vowel transitions $m$ and vowel presence without regex.

### 5. Lemmatizer (`core/nlp_steps.py`)
- **How it works**: Dual-layer system:
  1. Exact lookup table for irregular English verbs, nouns, and adjectives (`went` $\to$ `go`, `children` $\to$ `child`, `matrices` $\to$ `matrix`, `bought` $\to$ `buy`).
  2. Morphological inflection restoration rules (`-ies` $\to$ `-y`, `-ves` $\to$ `-f/-fe`, `-es` after sibilants).

### 6. Deep RAM Calculation (`core/memory_monitor.py`)
- Standard `sys.getsizeof(dict)` only measures the pointer bucket array, not nested contents. Our `deep_getsizeof(obj)` recursively traverses keys, values, inner lists, and floats while tracking object IDs to avoid double counting, yielding the true memory footprint.

---

## 🔮 Phase 2 Readiness (Client/Search Module)

The saved index `.json` / `.pkl` in `backend/data/saved_indexes/` contains:
1. `vocabulary`: Sorted term list.
2. `term_doc_freq`: Document frequencies ($DF$).
3. `doc_ids`: Document list.
4. `inverted_indexes`: Inverted lists for all 4 models (`bow`, `f`, `tf`, `tfidf`).
5. `pipeline_steps`: The exact NLP pipeline sequence used.

In Phase 2, the Client module can load this checkpoint and execute cosine similarity in milliseconds:
$$\text{CosineSimilarity}(Q, D) = \frac{\sum_{t \in Q \cap D} w(t, Q) \cdot w(t, D)}{\sqrt{\sum_{t \in Q} w(t, Q)^2} \cdot \sqrt{\sum_{t \in D} w(t, D)^2}}$$

