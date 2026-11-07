import React, { useEffect, useState } from 'react';
import { X, Tag, Terminal, Hash, AlignLeft } from 'lucide-react';
import { api } from '../services/api';

/**
 * Highlights occurrences of a stemmed/normalized vocabulary term inside raw text
 * using prefix-aware word matching (e.g. stem "export" highlights "exporters").
 */
function renderHighlightedText(text, term) {
  if (!text) return null;
  if (!term || term.trim().length < 2) return text;

  const escaped = term.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(\\b${escaped}[a-zA-Z0-9_-]*\\b)`, 'gi');
  const parts = text.split(regex);

  return parts.map((part, idx) => {
    if (idx % 2 === 1) {
      return (
        <mark
          key={idx}
          className="bg-indigo-100 text-indigo-900 font-semibold px-1 py-0.5 rounded border border-indigo-200/80"
        >
          {part}
        </mark>
      );
    }
    return part;
  });
}

export default function DocumentQuickPeek({ peekInfo, onClose, onSendToPipeline }) {
  const [fetchState, setFetchState] = useState({ docId: null, data: null, error: '' });
  const [viewMode, setViewMode] = useState('parsed'); // 'parsed' | 'full'

  useEffect(() => {
    const targetId = peekInfo?.docId;
    if (!targetId) return;

    let active = true;

    api.getDocumentDetail(targetId)
      .then((res) => {
        if (active) setFetchState({ docId: targetId, data: res, error: '' });
      })
      .catch((err) => {
        if (active) {
          setFetchState({
            docId: targetId,
            data: null,
            error: err.message || 'Unable to load document details.'
          });
        }
      });

    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);

    return () => {
      active = false;
      window.removeEventListener('keydown', handleKey);
    };
  }, [peekInfo, onClose]);

  if (!peekInfo) return null;

  const loading = fetchState.docId !== peekInfo.docId;
  const docData = loading ? null : fetchState.data;
  const error = loading ? '' : fetchState.error;

  const displayContent = viewMode === 'full' ? docData?.full_text : docData?.body;
  const wordCount = displayContent
    ? displayContent.trim().split(/\s+/).filter(Boolean).length
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/35 backdrop-blur-[2px]">
      {/* Click outside backdrop */}
      <div className="flex-1" onClick={onClose} />

      {/* Slide-Over Panel */}
      <aside className="animate-slide-in-right w-full max-w-xl bg-white border-l border-slate-200 shadow-2xl flex flex-col h-full">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/70 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/80 font-mono text-[11px] font-semibold">
                <Hash className="w-3 h-3" />
                Doc #{peekInfo.docId}
              </span>
              {peekInfo.highlightTerm && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-mono text-[11px]">
                  Term: <strong>{peekInfo.highlightTerm}</strong>
                  {peekInfo.weight !== undefined && (
                    <span className="text-emerald-600/80">
                      ({peekInfo.modelLabel || 'w'}: {peekInfo.weight})
                    </span>
                  )}
                </span>
              )}
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-1.5 leading-snug">
              {loading ? 'Loading document...' : docData?.title || `Document #${peekInfo.docId}`}
            </h3>
          </div>

          <button
            onClick={onClose}
            aria-label="Close document inspector"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sub-toolbar: Topics + View Toggle */}
        {docData && !loading && (
          <div className="px-6 py-2.5 border-b border-slate-100 bg-white flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              {docData.topics?.length > 0 ? (
                docData.topics.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-mono text-[11px]"
                  >
                    <Tag className="w-2.5 h-2.5 text-indigo-500" />
                    {t}
                  </span>
                ))
              ) : (
                <span className="text-slate-400 text-[11px]">No topic tags</span>
              )}
              <span className="text-slate-400 font-mono text-[11px] tabular-nums">
                &bull; {wordCount} words
              </span>
            </div>

            <div className="inline-flex bg-slate-100 p-0.5 rounded-lg border border-slate-200/80">
              <button
                onClick={() => setViewMode('parsed')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                  viewMode === 'parsed'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Article Body
              </button>
              <button
                onClick={() => setViewMode('full')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                  viewMode === 'full'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Full Indexed Text
              </button>
            </div>
          </div>
        )}

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-4 bg-slate-100 rounded w-3/4" />
              <div className="h-4 bg-slate-100 rounded w-full" />
              <div className="h-4 bg-slate-100 rounded w-5/6" />
              <div className="h-4 bg-slate-100 rounded w-2/3" />
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {error}
            </div>
          ) : docData ? (
            <div className="studio-well p-4 font-mono text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
              {renderHighlightedText(displayContent, peekInfo.highlightTerm)}
            </div>
          ) : null}
        </div>

        {/* Footer Actions */}
        {docData && (
          <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between gap-3">
            <span className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <AlignLeft className="w-3.5 h-3.5 text-slate-400" />
              {(displayContent || '').length.toLocaleString()} characters
            </span>

            <div className="flex items-center gap-2">
              {onSendToPipeline && (
                <button
                  onClick={() => {
                    onSendToPipeline(docData.full_text || docData.body || '');
                    onClose();
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                >
                  <Terminal className="w-3.5 h-3.5" />
                  Test in NLP Pipeline
                </button>
              )}
              <button
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-medium transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
