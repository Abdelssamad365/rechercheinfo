import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, RefreshCw, Eye, X, BookOpen, Layers } from 'lucide-react';
import { api } from '../services/api';

export default function DatasetSection({
  datasetName,
  docCount,
  onDatasetLoaded,
  loading,
  setLoading
}) {
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [previewDocs, setPreviewDocs] = useState([]);
  const [showDocModal, setShowDocModal] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
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

  const openDocumentViewer = async () => {
    try {
      const res = await api.getDocuments(1, 20);
      setPreviewDocs(res.items || []);
      setShowDocModal(true);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
      {/* Glow highlight */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white tracking-tight">1. Data Ingestion & Corpus Explorer</h2>
            <p className="text-xs text-gray-400">Ingest Reuters-21578 SGML, XML or plain text collections from disk</p>
          </div>
        </div>

        {docCount > 0 && (
          <button
            onClick={openDocumentViewer}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 transition-colors border border-gray-700 cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 text-indigo-400" />
            Inspect Ingested Docs ({docCount})
          </button>
        )}
      </div>

      {uploadError && (
        <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
          {uploadError}
        </div>
      )}

      {/* Upload & Load Sample Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Upload Card */}
        <label className="border-2 border-dashed border-gray-800 hover:border-indigo-500/50 bg-gray-900/60 rounded-xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all group">
          <input
            type="file"
            accept=".sgm,.xml,.txt,.json,.csv"
            onChange={handleFileUpload}
            disabled={loading}
            className="hidden"
          />
          <div className="p-3 rounded-full bg-gray-800 text-gray-400 group-hover:text-indigo-400 group-hover:scale-105 transition-all mb-2">
            <Upload className="w-5 h-5" />
          </div>
          <span className="text-sm font-medium text-gray-200 group-hover:text-white">
            Choose Reuters File from Local Disk
          </span>
          <span className="text-xs text-gray-500 mt-1">
            Supports .sgm (Reuters-21578), .xml, or raw .txt
          </span>
        </label>

        {/* Load Sample Card */}
        <div className="border border-gray-800 bg-gray-900/60 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-medium text-gray-200">Built-in Reuters-21578 Sample</span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                20 Articles
              </span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Instantly loads curated Reuters news with SGML tags covering cocoa, grain, crude oil, currencies, acquisitions, and trade.
            </p>
          </div>

          <button
            onClick={handleLoadSample}
            disabled={loading}
            className="mt-4 flex items-center justify-center gap-2 w-full py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-medium transition-all shadow-md shadow-indigo-600/20 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Load Built-in Sample Corpus
          </button>
        </div>

      </div>

      {/* Active Corpus Status Bar */}
      <div className="mt-4 pt-4 border-t border-gray-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-gray-400">
          <span className="text-gray-500">Active Corpus:</span>
          <span className="font-mono text-gray-200 bg-gray-800 px-2 py-0.5 rounded">
            {datasetName}
          </span>
        </div>
        <div className="flex items-center gap-4 text-gray-400">
          <span>Ingested: <strong className="text-white font-mono">{docCount}</strong> documents</span>
          <span className="flex items-center gap-1 text-emerald-400">
            <CheckCircle className="w-3.5 h-3.5" /> Ready for NLP
          </span>
        </div>
      </div>

      {/* Modal: Document Inspector */}
      {showDocModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#111827] border border-gray-800 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-white">Ingested Corpus Documents</h3>
                <p className="text-xs text-gray-400">Showing first {previewDocs.length} documents from {datasetName}</p>
              </div>
              <button
                onClick={() => setShowDocModal(false)}
                className="p-1 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Document List */}
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                {previewDocs.map((doc) => (
                  <div
                    key={doc.doc_id}
                    onClick={() => setSelectedDoc(doc)}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      selectedDoc?.doc_id === doc.doc_id
                        ? 'bg-indigo-600/10 border-indigo-500 text-white'
                        : 'bg-gray-900 border-gray-800 hover:border-gray-700 text-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-[11px] text-indigo-400">Doc ID: #{doc.doc_id}</span>
                      {doc.topics?.length > 0 && (
                        <div className="flex gap-1">
                          {doc.topics.slice(0, 2).map(t => (
                            <span key={t} className="text-[10px] bg-gray-800 px-1.5 py-0.2 rounded text-gray-400 font-mono">
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <h4 className="text-xs font-semibold truncate">{doc.title || 'Untitled Document'}</h4>
                    <p className="text-[11px] text-gray-400 line-clamp-2 mt-1">{doc.preview}</p>
                  </div>
                ))}
              </div>

              {/* Document Detail Preview */}
              <div className="bg-gray-950 border border-gray-800 rounded-xl p-4 flex flex-col max-h-[500px] overflow-y-auto font-mono text-xs">
                {selectedDoc ? (
                  <>
                    <div className="border-b border-gray-800 pb-2 mb-3">
                      <div className="text-[10px] text-indigo-400 uppercase tracking-wider">Document Inspector</div>
                      <div className="text-sm font-bold text-white mt-0.5">{selectedDoc.title}</div>
                      <div className="text-[11px] text-gray-500 mt-1">ID: {selectedDoc.doc_id}</div>
                    </div>
                    <div className="text-gray-300 whitespace-pre-wrap leading-relaxed text-xs">
                      {selectedDoc.body}
                    </div>
                  </>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-500 text-center">
                    Click any document on the left to inspect its full text.
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

