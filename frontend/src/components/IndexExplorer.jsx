import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Table,
  ListFilter,
  ArrowLeft,
  ArrowRight,
  X,
  Calculator,
  Lock,
  Play,
  RefreshCw,
  Eye
} from 'lucide-react';
import { api } from '../services/api';

const MODELS = [
  {
    id: 'tfidf',
    label: 'TF-IDF',
    formula: 'w(t, d) = TF(t, d) × log₁₀(1 + N / df(t))',
    desc: 'Rewards terms frequent in document d while penalizing ubiquitous corpus terms.'
  },
  {
    id: 'tf',
    label: 'Normalized TF',
    formula: 'w(t, d) = f(t, d) / max f(t′, d)',
    desc: 'Max-normalized term frequency preventing bias toward long documents.'
  },
  {
    id: 'f',
    label: 'Frequency (F)',
    formula: 'w(t, d) = count(t ∈ d)',
    desc: 'Raw integer occurrence count of vocabulary term t inside document d.'
  },
  {
    id: 'bow',
    label: 'Binary BoW',
    formula: 'w(t, d) ∈ {0, 1}',
    desc: 'Boolean incidence representation: 1 if term t occurs in document d, else 0.'
  }
];

/**
 * Returns crisp editorial light-mode heatmap cell classes (Stone/Teal/Obsidian scale)
 * with zero purple/indigo.
 */
function getHeatmapCellStyle(val, maxVal) {
  if (!val || val <= 0) {
    return 'text-zinc-300 bg-transparent';
  }
  const ratio = maxVal > 0 ? val / maxVal : 0.5;
  if (ratio >= 0.75) {
    return 'bg-zinc-900 text-white font-bold shadow-2xs';
  }
  if (ratio >= 0.45) {
    return 'bg-teal-100 text-teal-950 font-semibold';
  }
  if (ratio >= 0.2) {
    return 'bg-teal-50 text-teal-900 font-medium';
  }
  return 'bg-zinc-100 text-zinc-800 font-medium';
}

export default function IndexExplorer({
  isIndexed,
  docCount,
  onGenerateIndexes,
  isGenerating,
  onInspectDocument
}) {
  const [selectedModel, setSelectedModel] = useState('tfidf');
  const [selectedFormat, setSelectedFormat] = useState('postings'); // 'postings' | 'doc_term' | 'term_doc'
  const [pageSize, setPageSize] = useState(15);
  const [dotZeros, setDotZeros] = useState(true);

  const [searchInput, setSearchInput] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const [postingsPage, setPostingsPage] = useState(1);
  const [postingsStore, setPostingsStore] = useState({ key: '', data: null });

  const [matrixPage, setMatrixPage] = useState(1);
  const [matrixStore, setMatrixStore] = useState({ key: '', data: null });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchInput.trim());
      setPostingsPage(1);
      setMatrixPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const postingsKey = `${selectedModel}|${debouncedQuery}|${postingsPage}|${pageSize}|${isIndexed}`;
  const matrixKey = `${selectedModel}|${selectedFormat}|${debouncedQuery}|${matrixPage}|${pageSize}|${isIndexed}`;

  useEffect(() => {
    if (!isIndexed || selectedFormat !== 'postings') return;

    let isMounted = true;

    api.getPostings(selectedModel, debouncedQuery, postingsPage, pageSize)
      .then((res) => {
        if (isMounted) setPostingsStore({ key: postingsKey, data: res });
      })
      .catch((err) => {
        console.error(err);
        if (isMounted) setPostingsStore({ key: postingsKey, data: null });
      });

    return () => {
      isMounted = false;
    };
  }, [isIndexed, selectedModel, selectedFormat, debouncedQuery, postingsPage, pageSize, postingsKey]);

  useEffect(() => {
    if (!isIndexed || selectedFormat === 'postings') return;

    let isMounted = true;

    api.getMatrixSlice(selectedModel, selectedFormat, matrixPage, pageSize, debouncedQuery)
      .then((res) => {
        if (isMounted) setMatrixStore({ key: matrixKey, data: res });
      })
      .catch((err) => {
        console.error(err);
        if (isMounted) setMatrixStore({ key: matrixKey, data: null });
      });

    return () => {
      isMounted = false;
    };
  }, [isIndexed, selectedModel, selectedFormat, matrixPage, pageSize, debouncedQuery, matrixKey]);

  const loadingPostings =
    isIndexed && selectedFormat === 'postings' && postingsStore.key !== postingsKey;
  const postingsData = postingsStore.data;

  const loadingMatrix =
    isIndexed && selectedFormat !== 'postings' && matrixStore.key !== matrixKey;
  const matrixData = matrixStore.data;

  const maxSliceWeight = useMemo(() => {
    if (!matrixData?.rows || !matrixData?.columns) return 1;
    let max = 0;
    for (const row of matrixData.rows) {
      for (const col of matrixData.columns) {
        const v = row.weights?.[col] ?? 0;
        if (v > max) max = v;
      }
    }
    return max || 1;
  }, [matrixData]);

  if (!isIndexed) {
    return (
      <div className="studio-card p-6 sm:p-7">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-9 h-9 rounded-lg bg-zinc-100 text-zinc-400 border border-zinc-200 flex items-center justify-center shrink-0">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-[11px] font-bold text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
                  04
                </span>
                <h2 className="text-base sm:text-lg font-bold text-zinc-900 tracking-tight">
                  Multi-Model Index &amp; Heatmap Matrix Explorer
                </h2>
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                Generate or restore an index checkpoint to inspect Inverted Posting Lists, Document-Term matrices, and Term-Document heatmaps across all 4 models.
              </p>
            </div>
          </div>

          <button
            onClick={onGenerateIndexes}
            disabled={isGenerating || docCount === 0}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 self-start md:self-auto shrink-0"
          >
            {isGenerating ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3 h-3 fill-white" />
            )}
            {isGenerating ? 'Generating...' : 'Generate Indexes'}
          </button>
        </div>
      </div>
    );
  }

  const activeModelObj = MODELS.find((m) => m.id === selectedModel) || MODELS[0];
  const totalDocsSafe = Math.max(1, docCount || 20);

  return (
    <div className="studio-card studio-card-hover p-6 sm:p-7">
      {/* Header & Segmented Model Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-[11px] font-bold text-zinc-700 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
              04
            </span>
            <h2 className="text-base sm:text-lg font-bold text-zinc-950 tracking-tight">
              Multi-Model Index &amp; Structures Explorer
            </h2>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Click any posting chip or document header to quick-peek the underlying article with highlighted terms
          </p>
        </div>

        {/* Segmented Model Tabs */}
        <div className="inline-flex flex-wrap bg-zinc-100 border border-zinc-200 p-1 rounded-xl self-start lg:self-auto">
          {MODELS.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelectedModel(m.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                selectedModel === m.id
                  ? 'bg-white text-zinc-950 shadow-2xs ring-1 ring-zinc-200'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mathematical Formula Strip */}
      <div className="mb-5 px-4 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-zinc-900">
          <Calculator className="w-4 h-4 text-zinc-500 shrink-0" />
          <span className="font-semibold">{activeModelObj.label}:</span>
          <code className="px-2 py-0.5 rounded bg-white border border-zinc-200 font-mono text-[11px] text-zinc-900 font-semibold">
            {activeModelObj.formula}
          </code>
        </div>
        <span className="text-[11px] text-zinc-500">{activeModelObj.desc}</span>
      </div>

      {/* Format Tabs & Search/Filter Toolbar */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 border-b border-zinc-200 pb-4 mb-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              setSelectedFormat('postings');
              setPostingsPage(1);
            }}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
              selectedFormat === 'postings'
                ? 'bg-zinc-900 border-zinc-900 text-white shadow-2xs'
                : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
            }`}
          >
            <ListFilter className="w-3.5 h-3.5" />
            Inverted Lists (Postings)
          </button>

          <button
            onClick={() => {
              setSelectedFormat('doc_term');
              setMatrixPage(1);
            }}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
              selectedFormat === 'doc_term'
                ? 'bg-zinc-900 border-zinc-900 text-white shadow-2xs'
                : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            Doc-Term Matrix (D &times; V)
          </button>

          <button
            onClick={() => {
              setSelectedFormat('term_doc');
              setMatrixPage(1);
            }}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
              selectedFormat === 'term_doc'
                ? 'bg-zinc-900 border-zinc-900 text-white shadow-2xs'
                : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            Term-Doc Matrix (V &times; D)
          </button>
        </div>

        {/* Right Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {selectedFormat !== 'postings' && (
            <label className="inline-flex items-center gap-1.5 text-xs text-zinc-600 bg-zinc-50 border border-zinc-200 px-2.5 py-1.5 rounded-lg cursor-pointer select-none">
              <input
                type="checkbox"
                checked={dotZeros}
                onChange={(e) => setDotZeros(e.target.checked)}
                className="rounded border-zinc-300 accent-zinc-900"
              />
              <span>Dim zeros (&middot;)</span>
            </label>
          )}

          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPostingsPage(1);
              setMatrixPage(1);
            }}
            aria-label="Rows per page"
            className="bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs text-zinc-700 font-medium focus:outline-none focus:border-zinc-900 cursor-pointer"
          >
            <option value={12}>12 rows</option>
            <option value={15}>15 rows</option>
            <option value={30}>30 rows</option>
            <option value={50}>50 rows</option>
          </select>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search vocabulary (e.g. cocoa, oil)..."
              className="w-full bg-white border border-zinc-200 rounded-lg pl-8 pr-8 py-1.5 text-xs text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900 font-mono"
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput('')}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-800 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* VIEW 1: Inverted Posting Lists */}
      {selectedFormat === 'postings' && (
        <div>
          {loadingPostings ? (
            <div className="py-14 text-center text-xs text-zinc-400 font-medium">
              Loading inverted posting lists...
            </div>
          ) : postingsData?.items?.length > 0 ? (
            <div className="space-y-3">
              <div className="overflow-x-auto border border-zinc-200 rounded-xl bg-white shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 text-zinc-500 border-b border-zinc-200 font-mono text-[11px] uppercase">
                    <tr>
                      <th className="py-3 px-4 w-44">Vocabulary Term</th>
                      <th className="py-3 px-4 w-36">Doc Freq (DF)</th>
                      <th className="py-3 px-4">
                        Posting List &bull; <span className="normal-case font-sans text-zinc-400">Click any (doc_id, weight) chip to inspect document</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 font-mono text-zinc-700">
                    {postingsData.items.map((row) => {
                      const dfPct = Math.min(100, Math.round((row.df / totalDocsSafe) * 100));
                      return (
                        <tr key={row.term} className="hover:bg-zinc-50/70 transition-colors">
                          <td className="py-3 px-4 font-bold text-zinc-950 align-top">
                            <span className="px-2 py-0.5 rounded bg-zinc-100 border border-zinc-200">
                              {row.term}
                            </span>
                          </td>
                          <td className="py-3 px-4 align-top tabular-nums">
                            <div className="font-semibold text-zinc-800">{row.df} docs</div>
                            <div className="w-20 h-1.5 bg-zinc-100 rounded-full overflow-hidden mt-1">
                              <div
                                className="h-full bg-zinc-800 rounded-full"
                                style={{ width: `${Math.max(6, dfPct)}%` }}
                              />
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                              {row.postings.map(([docId, weight], idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() =>
                                    onInspectDocument &&
                                    onInspectDocument(docId, row.term, weight, activeModelObj.label)
                                  }
                                  title={`Inspect Doc #${docId} with "${row.term}" highlighted`}
                                  className="group px-2 py-0.5 rounded bg-zinc-50 hover:bg-zinc-900 border border-zinc-200 hover:border-zinc-900 text-[11px] flex items-center gap-1 transition-all cursor-pointer tabular-nums"
                                >
                                  <span className="text-zinc-500 group-hover:text-zinc-300">
                                    doc_{docId}:
                                  </span>
                                  <strong className="text-teal-700 group-hover:text-white">
                                    {weight}
                                  </strong>
                                  <Eye className="w-2.5 h-2.5 text-zinc-300 group-hover:text-zinc-300 ml-0.5" />
                                </button>
                              ))}
                              {row.has_more && (
                                <span className="text-[11px] text-zinc-400 self-center pl-1">
                                  +{row.posting_count - row.postings.length} more
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between text-xs text-zinc-500 pt-1 px-1">
                <span className="tabular-nums">
                  Showing page <strong className="text-zinc-900">{postingsData.page}</strong> of{' '}
                  {Math.ceil(postingsData.total_terms / postingsData.page_size) || 1} (
                  {postingsData.total_terms.toLocaleString()} matching terms)
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setPostingsPage((p) => Math.max(1, p - 1))}
                    disabled={postingsPage <= 1}
                    className="p-1.5 rounded-lg bg-white border border-zinc-200 disabled:opacity-35 hover:bg-zinc-50 text-zinc-700 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setPostingsPage((p) => p + 1)}
                    disabled={postingsPage * postingsData.page_size >= postingsData.total_terms}
                    className="p-1.5 rounded-lg bg-white border border-zinc-200 disabled:opacity-35 hover:bg-zinc-50 text-zinc-700 cursor-pointer"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-zinc-400">
              No matching vocabulary terms found for &ldquo;{debouncedQuery}&rdquo;.
            </div>
          )}
        </div>
      )}

      {/* VIEW 2 & 3: Weight-Intensity Heatmap Matrix Slices */}
      {selectedFormat !== 'postings' && (
        <div>
          {loadingMatrix ? (
            <div className="py-14 text-center text-xs text-zinc-400 font-medium">
              Loading matrix slice...
            </div>
          ) : matrixData?.rows?.length > 0 ? (
            <div className="space-y-3">
              {/* Heatmap Legend */}
              <div className="flex items-center justify-between text-[11px] text-zinc-500 px-1">
                <span>
                  {selectedFormat === 'doc_term'
                    ? 'Rows = Documents, Columns = Vocabulary Terms'
                    : 'Rows = Vocabulary Terms, Columns = Documents'}
                </span>
                <div className="flex items-center gap-1.5">
                  <span>Weight Intensity:</span>
                  <span className="px-1.5 py-0.2 rounded bg-zinc-50 border border-zinc-200 text-zinc-400 font-mono">0</span>
                  <span className="px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-800 font-mono">Low</span>
                  <span className="px-1.5 py-0.2 rounded bg-teal-100 text-teal-950 font-mono">Med</span>
                  <span className="px-1.5 py-0.2 rounded bg-zinc-900 text-white font-mono">Peak</span>
                </div>
              </div>

              <div className="overflow-x-auto border border-zinc-200 rounded-xl bg-white shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-zinc-50 text-zinc-600 border-b border-zinc-200 font-mono text-[11px]">
                    <tr>
                      <th className="py-3 px-3.5 sticky left-0 bg-zinc-50 z-10 border-r border-zinc-200 sticky-col-divider min-w-[115px]">
                        {selectedFormat === 'doc_term' ? 'Document' : 'Term'}
                      </th>
                      {matrixData.columns.map((col) => (
                        <th key={col} className="py-2.5 px-2.5 text-center min-w-[74px] font-semibold">
                          {selectedFormat === 'doc_term' ? (
                            col
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                onInspectDocument &&
                                onInspectDocument(col, debouncedQuery, undefined, activeModelObj.label)
                              }
                              title={`Inspect Document #${col}`}
                              className="hover:text-zinc-950 underline decoration-dotted underline-offset-2 cursor-pointer"
                            >
                              doc_{col}
                            </button>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 font-mono tabular-nums">
                    {matrixData.rows.map((row) => (
                      <tr key={row.row_id} className="hover:bg-zinc-50/50">
                        <td className="py-2.5 px-3.5 font-bold text-zinc-950 sticky left-0 bg-white/95 backdrop-blur-xs z-10 border-r border-zinc-200 sticky-col-divider">
                          {selectedFormat === 'doc_term' ? (
                            <button
                              type="button"
                              onClick={() =>
                                onInspectDocument &&
                                onInspectDocument(
                                  row.row_id,
                                  debouncedQuery,
                                  undefined,
                                  activeModelObj.label
                                )
                              }
                              title={`Inspect Document #${row.row_id}`}
                              className="hover:text-teal-700 inline-flex items-center gap-1 cursor-pointer"
                            >
                              <span>Doc #{row.row_id}</span>
                              <Eye className="w-3 h-3 text-zinc-300" />
                            </button>
                          ) : (
                            row.row_id
                          )}
                        </td>
                        {matrixData.columns.map((col) => {
                          const val = row.weights?.[col] ?? 0;
                          const cellStyle = getHeatmapCellStyle(val, maxSliceWeight);
                          const docIdForClick = selectedFormat === 'doc_term' ? row.row_id : col;
                          const termForClick = selectedFormat === 'doc_term' ? col : row.row_id;

                          return (
                            <td key={col} className="p-1 text-center">
                              {val > 0 ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    onInspectDocument &&
                                    onInspectDocument(
                                      docIdForClick,
                                      termForClick,
                                      val,
                                      activeModelObj.label
                                    )
                                  }
                                  title={`Doc #${docIdForClick} • "${termForClick}" = ${val}`}
                                  className={`w-full py-1 px-1.5 rounded text-[11px] transition-transform hover:scale-105 cursor-pointer ${cellStyle}`}
                                >
                                  {val}
                                </button>
                              ) : (
                                <span className="text-[11px] text-zinc-300 select-none">
                                  {dotZeros ? '·' : '0'}
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Matrix Pagination */}
              <div className="flex items-center justify-between text-xs text-zinc-500 pt-1 px-1">
                <span className="tabular-nums">
                  Showing page <strong className="text-zinc-900">{matrixData.page}</strong> of{' '}
                  {Math.ceil(matrixData.total_rows / matrixData.page_size) || 1} (
                  {matrixData.total_rows.toLocaleString()} rows)
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setMatrixPage((p) => Math.max(1, p - 1))}
                    disabled={matrixPage <= 1}
                    className="p-1.5 rounded-lg bg-white border border-zinc-200 disabled:opacity-35 hover:bg-zinc-50 text-zinc-700 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setMatrixPage((p) => p + 1)}
                    disabled={matrixPage * matrixData.page_size >= matrixData.total_rows}
                    className="p-1.5 rounded-lg bg-white border border-zinc-200 disabled:opacity-35 hover:bg-zinc-50 text-zinc-700 cursor-pointer"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-zinc-400">
              No matrix entries match the current filter.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
