import React, { useState, useEffect } from 'react';
import { Search, Table, ListFilter, Layers, ArrowLeft, ArrowRight } from 'lucide-react';
import { api } from '../services/api';

const MODELS = [
  { id: 'tfidf', label: 'TF-IDF' },
  { id: 'tf', label: 'Normalized TF' },
  { id: 'f', label: 'Frequency (F)' },
  { id: 'bow', label: 'Bag of Words (Binary)' }
];

export default function IndexExplorer({ isIndexed }) {
  const [selectedModel, setSelectedModel] = useState('tfidf');
  const [selectedFormat, setSelectedFormat] = useState('postings'); // 'postings', 'doc_term', 'term_doc'

  // Postings View state
  const [postingsSearch, setPostingsSearch] = useState('');
  const [postingsPage, setPostingsPage] = useState(1);
  const [postingsData, setPostingsData] = useState(null);
  const [loadingPostings, setLoadingPostings] = useState(false);

  // Matrix View state
  const [matrixPage, setMatrixPage] = useState(1);
  const [matrixFilter, setMatrixFilter] = useState('');
  const [matrixData, setMatrixData] = useState(null);
  const [loadingMatrix, setLoadingMatrix] = useState(false);

  // Fetch postings whenever model, search, or page changes
  useEffect(() => {
    if (!isIndexed || selectedFormat !== 'postings') return;

    let isMounted = true;
    setLoadingPostings(true);

    api.getPostings(selectedModel, postingsSearch, postingsPage, 15)
      .then((res) => {
        if (isMounted) setPostingsData(res);
      })
      .catch((err) => console.error(err))
      .finally(() => {
        if (isMounted) setLoadingPostings(false);
      });

    return () => { isMounted = false; };
  }, [isIndexed, selectedModel, selectedFormat, postingsSearch, postingsPage]);

  // Fetch matrix slice whenever model, format, or page changes
  useEffect(() => {
    if (!isIndexed || selectedFormat === 'postings') return;

    let isMounted = true;
    setLoadingMatrix(true);

    api.getMatrixSlice(selectedModel, selectedFormat, matrixPage, 12, matrixFilter)
      .then((res) => {
        if (isMounted) setMatrixData(res);
      })
      .catch((err) => console.error(err))
      .finally(() => {
        if (isMounted) setLoadingMatrix(false);
      });

    return () => { isMounted = false; };
  }, [isIndexed, selectedModel, selectedFormat, matrixPage, matrixFilter]);

  if (!isIndexed) return null;

  return (
    <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white tracking-tight">4. Multi-Model Index & Structures Explorer</h2>
            <p className="text-xs text-gray-400">Inspect 4 mathematical weighting models across 3 physical formats</p>
          </div>
        </div>

        {/* Model Tabs */}
        <div className="flex bg-gray-900 border border-gray-800 p-1 rounded-xl self-start md:self-auto">
          {MODELS.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelectedModel(m.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                selectedModel === m.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Format Selector Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-800 pb-3 mb-4">
        <div className="flex gap-2">
          <button
            onClick={() => { setSelectedFormat('postings'); setPostingsPage(1); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
              selectedFormat === 'postings'
                ? 'bg-indigo-600/15 border-indigo-500 text-indigo-300'
                : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-700'
            }`}
          >
            <ListFilter className="w-3.5 h-3.5" />
            Inverted Lists (Posting Lists)
          </button>

          <button
            onClick={() => { setSelectedFormat('doc_term'); setMatrixPage(1); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
              selectedFormat === 'doc_term'
                ? 'bg-indigo-600/15 border-indigo-500 text-indigo-300'
                : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-700'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            Doc-Term Matrix (Docs &times; Terms)
          </button>

          <button
            onClick={() => { setSelectedFormat('term_doc'); setMatrixPage(1); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
              selectedFormat === 'term_doc'
                ? 'bg-indigo-600/15 border-indigo-500 text-indigo-300'
                : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-700'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            Term-Doc Matrix (Terms &times; Docs)
          </button>
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={selectedFormat === 'postings' ? postingsSearch : matrixFilter}
            onChange={(e) => {
              if (selectedFormat === 'postings') {
                setPostingsSearch(e.target.value);
                setPostingsPage(1);
              } else {
                setMatrixFilter(e.target.value);
                setMatrixPage(1);
              }
            }}
            placeholder="Search terms (e.g. cocoa, oil)..."
            className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-indigo-500 font-mono"
          />
        </div>
      </div>

      {/* VIEW 1: Inverted Lists (Posting Lists) */}
      {selectedFormat === 'postings' && (
        <div>
          {loadingPostings ? (
            <div className="py-12 text-center text-xs text-gray-400">Loading postings...</div>
          ) : postingsData?.items?.length > 0 ? (
            <div className="space-y-2">
              <div className="overflow-x-auto border border-gray-800 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-900 text-gray-400 border-b border-gray-800 font-mono">
                    <tr>
                      <th className="p-3 w-40">Vocabulary Term</th>
                      <th className="p-3 w-28">Doc Freq (DF)</th>
                      <th className="p-3">Posting List &bull; (DocID, Weight)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800 font-mono text-gray-300">
                    {postingsData.items.map((row) => (
                      <tr key={row.term} className="hover:bg-gray-900/60">
                        <td className="p-3 font-semibold text-white">{row.term}</td>
                        <td className="p-3 text-indigo-400 font-semibold">{row.df} docs</td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                            {row.postings.map(([docId, weight], idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded bg-gray-900 border border-gray-800 text-[11px] text-gray-300 flex items-center gap-1 hover:border-indigo-500/50"
                              >
                                <span className="text-gray-400">doc_{docId}:</span>
                                <strong className="text-emerald-400">{weight}</strong>
                              </span>
                            ))}
                            {row.has_more && (
                              <span className="text-[10px] text-gray-500 self-center">
                                +{row.posting_count - row.postings.length} more
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between text-xs text-gray-400 pt-2 px-1">
                <span>
                  Showing page {postingsData.page} of {Math.ceil(postingsData.total_terms / postingsData.page_size) || 1} ({postingsData.total_terms} matching terms)
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setPostingsPage((p) => Math.max(1, p - 1))}
                    disabled={postingsPage <= 1}
                    className="p-1.5 rounded bg-gray-900 border border-gray-800 disabled:opacity-30 hover:border-gray-700 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setPostingsPage((p) => p + 1)}
                    disabled={postingsPage * postingsData.page_size >= postingsData.total_terms}
                    className="p-1.5 rounded bg-gray-900 border border-gray-800 disabled:opacity-30 hover:border-gray-700 cursor-pointer"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-gray-500">
              No matching terms found in vocabulary.
            </div>
          )}
        </div>
      )}

      {/* VIEW 2 & 3: Matrix Slices (Doc-Term & Term-Doc) */}
      {selectedFormat !== 'postings' && (
        <div>
          {loadingMatrix ? (
            <div className="py-12 text-center text-xs text-gray-400">Loading matrix slice...</div>
          ) : matrixData?.rows?.length > 0 ? (
            <div className="space-y-2">
              <div className="overflow-x-auto border border-gray-800 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-900 text-gray-400 border-b border-gray-800 font-mono">
                    <tr>
                      <th className="p-3 sticky left-0 bg-gray-900 z-10 border-r border-gray-800">
                        {selectedFormat === 'doc_term' ? 'Doc ID' : 'Term'}
                      </th>
                      {matrixData.columns.map((col) => (
                        <th key={col} className="p-2.5 text-center min-w-[70px]">
                          {selectedFormat === 'doc_term' ? col : `doc_${col}`}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800 font-mono text-gray-300">
                    {matrixData.rows.map((row) => (
                      <tr key={row.row_id} className="hover:bg-gray-900/60">
                        <td className="p-3 font-semibold text-white sticky left-0 bg-[#111827] z-10 border-r border-gray-800">
                          {selectedFormat === 'doc_term' ? `Doc #${row.row_id}` : row.row_id}
                        </td>
                        {matrixData.columns.map((col) => {
                          const val = row.weights?.[col] ?? 0;
                          return (
                            <td
                              key={col}
                              className={`p-2.5 text-center text-[11px] ${
                                val > 0 ? 'text-emerald-400 font-medium bg-emerald-500/5' : 'text-gray-600'
                              }`}
                            >
                              {val > 0 ? val : '0'}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between text-xs text-gray-400 pt-2 px-1">
                <span>
                  Showing page {matrixData.page} of {Math.ceil(matrixData.total_rows / matrixData.page_size) || 1}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setMatrixPage((p) => Math.max(1, p - 1))}
                    disabled={matrixPage <= 1}
                    className="p-1.5 rounded bg-gray-900 border border-gray-800 disabled:opacity-30 hover:border-gray-700 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setMatrixPage((p) => p + 1)}
                    disabled={matrixPage * matrixData.page_size >= matrixData.total_rows}
                    className="p-1.5 rounded bg-gray-900 border border-gray-800 disabled:opacity-30 hover:border-gray-700 cursor-pointer"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-gray-500">
              No matrix data found.
            </div>
          )}
        </div>
      )}

    </div>
  );
}

