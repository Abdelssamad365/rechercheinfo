import React, { useState, useEffect } from 'react';
import {
  Upload,
  FileText,
  CheckCircle2,
  RefreshCw,
  Eye,
  X,
  BookOpen,
  Search,
  ArrowLeft,
  ArrowRight,
  Tag,
  Terminal,
  FileCode2
} from 'lucide-react';
import { api } from '../services/api';

const SAMPLE_TOPICS = ['cocoa', 'grain', 'crude', 'acq', 'money-fx', 'trade'];
const SUPPORTED_EXTS = ['.sgm', '.xml', '.txt', '.json', '.csv'];

export default function DatasetSection({
  datasetName,
  docCount,
  onDatasetLoaded,
  onSendToPipeline,
  loading,
  setLoading
}) {
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [previewDocs, setPreviewDocs] = useState([]);
  const [totalDocs, setTotalDocs] = useState(0);
  const [docPage, setDocPage] = useState(1);
  const [docSearch, setDocSearch] = useState('');
  const [showDocModal, setShowDocModal] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [docViewTab, setDocViewTab] = useState('parsed'); // 'parsed' | 'full'

  const pageSize = 15;

  const ingestFile = async (file) => {
    if (!file) return;
    setLoading(true);
    setUploadError('');
    try {
      const res = await api.uploadFile(file);
      onDatasetLoaded(res.dataset_name, res.count);
      setPreviewDocs(res.documents || []);
    } catch (err) {
      setUploadError(err.message || 'Error uploading dataset.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    ingestFile(file);
    e.target.value = '';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!loading) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (loading) return;
    const file = e.dataTransfer.files?.[0];
    ingestFile(file);
  };

  const handleLoadSample = async () => {
    setLoading(true);
    setUploadError('');
    try {
      const res = await api.loadSample();
      onDatasetLoaded(res.dataset_name, res.count);
      setPreviewDocs(res.documents || []);
    } catch (err) {
      setUploadError(err.message || 'Error loading sample Reuters data.');
    } finally {
      setLoading(false);
    }
  };

  const fetchModalPage = async (pageToLoad) => {
    setLoadingDocs(true);
    try {
      const res = await api.getDocuments(pageToLoad, pageSize);
      const items = res.items || [];
      setPreviewDocs(items);
      setTotalDocs(res.total || items.length);
      setDocPage(res.page || pageToLoad);
      if (items.length > 0) {
        setSelectedDoc((prev) => items.find((d) => d.doc_id === prev?.doc_id) || items[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDocs(false);
    }
  };

  const openDocumentViewer = () => {
    setDocSearch('');
    setShowDocModal(true);
    fetchModalPage(1);
  };

  useEffect(() => {
    if (!showDocModal) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setShowDocModal(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showDocModal]);

  const filteredDocs = previewDocs.filter((d) => {
    if (!docSearch.trim()) return true;
    const q = docSearch.toLowerCase();
    return (
      (d.title || '').toLowerCase().includes(q) ||
      (d.body || '').toLowerCase().includes(q) ||
      String(d.doc_id).toLowerCase().includes(q) ||
      (d.topics || []).some((t) => t.toLowerCase().includes(q))
    );
  });

  const totalPages = Math.max(1, Math.ceil(totalDocs / pageSize));

  return (
    <div className="studio-card studio-card-hover p-6 sm:p-7 relative overflow-hidden">
      {/* Subtle Top Hairline Accent */}
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-500 opacity-85" />

      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200/80 flex items-center justify-center shrink-0 shadow-2xs">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200/60">
                STAGE 01
              </span>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Data Ingestion &amp; Corpus Explorer
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Ingest Reuters-21578 SGML, XML, or plain-text collections using our zero-dependency parser
            </p>
          </div>
        </div>

        {docCount > 0 && (
          <button
            onClick={openDocumentViewer}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 hover:text-indigo-700 transition-all border border-slate-200 hover:border-indigo-200 shadow-2xs cursor-pointer self-start sm:self-auto"
          >
            <Eye className="w-4 h-4 text-indigo-600" />
            <span>Inspect Corpus</span>
            <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono text-[11px] tabular-nums">
              {docCount}
            </span>
          </button>
        )}
      </div>

      {uploadError && (
        <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center justify-between">
          <span>{uploadError}</span>
          <button
            onClick={() => setUploadError('')}
            className="text-rose-400 hover:text-rose-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Ingestion Grid: Drag & Drop + Sample Corpus */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Interactive Drag-and-Drop File Zone */}
        <label
          onDragEnter={handleDragOver}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all border-2 border-dashed ${
            isDragging
              ? 'border-indigo-500 bg-indigo-50/70 ring-4 ring-indigo-500/10 scale-[1.005]'
              : 'border-slate-300/90 hover:border-indigo-400 bg-slate-50/60 hover:bg-indigo-50/25'
          } ${loading ? 'opacity-60 pointer-events-none' : ''}`}
        >
          <input
            type="file"
            accept=".sgm,.xml,.txt,.json,.csv"
            onChange={handleFileUpload}
            disabled={loading}
            className="hidden"
          />
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 transition-all shadow-xs border ${
              isDragging
                ? 'bg-indigo-600 text-white border-indigo-600 scale-110'
                : 'bg-white text-indigo-600 border-slate-200'
            }`}
          >
            <Upload className="w-5 h-5" />
          </div>

          <span className="text-sm font-bold text-slate-800">
            {isDragging ? 'Drop dataset file to ingest' : 'Drop a corpus file here, or click to browse'}
          </span>
          <span className="text-xs text-slate-500 mt-1">
            Automatic SGML tag extraction (`&lt;REUTERS&gt;`, `&lt;TITLE&gt;`, `&lt;BODY&gt;`) or paragraph splitting
          </span>

          <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3.5">
            {SUPPORTED_EXTS.map((ext) => (
              <span
                key={ext}
                className="px-2 py-0.5 rounded-md bg-white border border-slate-200/90 text-[11px] font-mono text-slate-600"
              >
                {ext}
              </span>
            ))}
          </div>
        </label>

        {/* Curated Reuters-21578 Sample Card */}
        <div className="studio-well p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <FileCode2 className="w-4 h-4 text-indigo-600" />
                <span className="text-sm font-bold text-slate-900">
                  Built-in Reuters-21578 Benchmark
                </span>
              </div>
              <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                20 SGML Docs
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Pre-curated financial &amp; commodities dispatches containing authentic SGML markup, entity codes, and multi-topic labels for instant IR testing.
            </p>

            {/* Topic Preview Pills */}
            <div className="flex flex-wrap items-center gap-1.5 mt-3.5">
              <span className="text-[11px] text-slate-400 mr-0.5">Topics:</span>
              {SAMPLE_TOPICS.map((topic) => (
                <span
                  key={topic}
                  className="px-2 py-0.5 rounded-full bg-white border border-slate-200 text-[11px] font-mono text-slate-600"
                >
                  #{topic}
                </span>
              ))}
            </div>
          </div>

          <button
            onClick={handleLoadSample}
            disabled={loading}
            className="mt-5 inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-white hover:bg-indigo-50/60 active:bg-indigo-100/50 text-indigo-700 border border-indigo-200 hover:border-indigo-300 text-xs font-semibold transition-all shadow-2xs cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Ingesting Corpus...' : 'Reload Built-in Reuters Sample'}
          </button>
        </div>
      </div>

      {/* Active Corpus Status Strip */}
      <div className="mt-5 pt-4 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-600">
          <FileText className="w-4 h-4 text-slate-400" />
          <span className="text-slate-500">Active Collection:</span>
          <span className="font-mono font-semibold text-slate-800 bg-slate-100 border border-slate-200/80 px-2.5 py-0.5 rounded-md">
            {datasetName}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-slate-600">
            Parsed Documents:{' '}
            <strong className="text-slate-900 font-mono tabular-nums">{docCount}</strong>
          </span>
          {docCount > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Ready for Pipeline
            </span>
          )}
        </div>
      </div>

      {/* Split-Pane Corpus Inspector Modal */}
      {showDocModal && (
        <div
          onClick={() => setShowDocModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="animate-slide-up bg-white border border-slate-200 rounded-2xl w-full max-w-5xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden"
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">Corpus Document Inspector</h3>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px] font-mono font-semibold tabular-nums">
                    {totalDocs} total docs
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Collection: <span className="font-medium text-slate-700">{datasetName}</span>
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                {/* Search inside loaded page */}
                <div className="relative w-56">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={docSearch}
                    onChange={(e) => setDocSearch(e.target.value)}
                    placeholder="Filter title, topic, text..."
                    className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <button
                  onClick={() => setShowDocModal(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-200/70 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Split Pane Body */}
            <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[420px]">
              {/* Left List Pane (5 cols) */}
              <div className="md:col-span-5 border-b md:border-b-0 md:border-r border-slate-200 flex flex-col bg-slate-50/50 max-h-[68vh]">
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {loadingDocs ? (
                    <div className="py-12 text-center text-xs text-slate-400">
                      Loading documents...
                    </div>
                  ) : filteredDocs.length > 0 ? (
                    filteredDocs.map((doc) => {
                      const active = selectedDoc?.doc_id === doc.doc_id;
                      return (
                        <button
                          key={doc.doc_id}
                          onClick={() => setSelectedDoc(doc)}
                          className={`w-full p-3 rounded-xl border text-left transition-all cursor-pointer ${
                            active
                              ? 'bg-white border-indigo-400 ring-2 ring-indigo-500/10 shadow-xs'
                              : 'bg-white/70 border-slate-200/80 hover:bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span
                              className={`font-mono text-[11px] font-semibold ${
                                active ? 'text-indigo-600' : 'text-slate-500'
                              }`}
                            >
                              Doc #{doc.doc_id}
                            </span>
                            {doc.topics?.length > 0 && (
                              <div className="flex gap-1 flex-wrap justify-end">
                                {doc.topics.slice(0, 2).map((t) => (
                                  <span
                                    key={t}
                                    className="text-[10px] bg-slate-100 border border-slate-200 px-1.5 py-0.2 rounded text-slate-600 font-mono"
                                  >
                                    {t}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <h4 className="text-xs font-bold text-slate-900 truncate">
                            {doc.title || 'Untitled Dispatch'}
                          </h4>
                          <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                            {doc.preview}
                          </p>
                        </button>
                      );
                    })
                  ) : (
                    <div className="py-10 text-center text-xs text-slate-400">
                      No documents match filter on this page.
                    </div>
                  )}
                </div>

                {/* Pagination Bar */}
                <div className="px-4 py-2.5 border-t border-slate-200 bg-white flex items-center justify-between text-xs text-slate-500">
                  <span className="tabular-nums">
                    Page <strong className="text-slate-800">{docPage}</strong> of {totalPages}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => fetchModalPage(Math.max(1, docPage - 1))}
                      disabled={docPage <= 1 || loadingDocs}
                      className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 disabled:opacity-35 hover:bg-slate-100 text-slate-700 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => fetchModalPage(Math.min(totalPages, docPage + 1))}
                      disabled={docPage >= totalPages || loadingDocs}
                      className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 disabled:opacity-35 hover:bg-slate-100 text-slate-700 cursor-pointer"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Detail Pane (7 cols) */}
              <div className="md:col-span-7 flex flex-col bg-white max-h-[68vh]">
                {selectedDoc ? (
                  <>
                    <div className="px-5 py-3.5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
                          Selected Document &bull; ID #{selectedDoc.doc_id}
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 mt-0.5">
                          {selectedDoc.title || 'Untitled Document'}
                        </h4>
                      </div>

                      <div className="inline-flex bg-slate-100 p-0.5 rounded-lg border border-slate-200/80">
                        <button
                          onClick={() => setDocViewTab('parsed')}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-medium cursor-pointer ${
                            docViewTab === 'parsed'
                              ? 'bg-white text-slate-900 shadow-2xs'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          Body Only
                        </button>
                        <button
                          onClick={() => setDocViewTab('full')}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-medium cursor-pointer ${
                            docViewTab === 'full'
                              ? 'bg-white text-slate-900 shadow-2xs'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          Title + Body
                        </button>
                      </div>
                    </div>

                    {selectedDoc.topics?.length > 0 && (
                      <div className="px-5 py-2 bg-slate-50/70 border-b border-slate-100 flex items-center gap-1.5 flex-wrap">
                        <Tag className="w-3 h-3 text-indigo-500" />
                        {selectedDoc.topics.map((t) => (
                          <span
                            key={t}
                            className="px-2 py-0.5 rounded-full bg-white border border-slate-200 text-[11px] font-mono text-slate-700"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex-1 overflow-y-auto p-5">
                      <div className="studio-well p-4 font-mono text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                        {docViewTab === 'full'
                          ? `${selectedDoc.title ? `${selectedDoc.title}\n\n` : ''}${selectedDoc.body || ''}`
                          : selectedDoc.body || '(Empty document body)'}
                      </div>
                    </div>

                    <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/60 flex items-center justify-between gap-3">
                      <span className="text-[11px] text-slate-500 font-mono tabular-nums">
                        {(selectedDoc.body || '').split(/\s+/).filter(Boolean).length} words
                      </span>
                      {onSendToPipeline && (
                        <button
                          onClick={() => {
                            const txt = selectedDoc.title
                              ? `${selectedDoc.title}\n${selectedDoc.body}`
                              : selectedDoc.body;
                            onSendToPipeline(txt);
                            setShowDocModal(false);
                          }}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                        >
                          <Terminal className="w-3.5 h-3.5" />
                          Send to NLP Dry-Run Tester
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 text-xs p-6">
                    Select a document on the left to inspect its parsed content.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
