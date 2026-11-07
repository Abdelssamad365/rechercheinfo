import React, { useState, useEffect } from 'react';
import {
  HardDrive,
  Save,
  RefreshCw,
  FolderDown,
  Sparkles,
  CheckCircle2,
  FileJson,
  Clock,
  Binary
} from 'lucide-react';
import { api } from '../services/api';

function formatCheckpointDate(rawDate) {
  if (!rawDate) return '';
  const parsed = new Date(rawDate);
  if (Number.isNaN(parsed.getTime())) return rawDate;
  return parsed.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export default function ExportSection({
  isIndexed,
  stepOrder = [],
  activeCheckpointName = '',
  onIndexLoaded,
  onNotify
}) {
  const [saveName, setSaveName] = useState('reuters_phase1_index');
  const [isSaving, setIsSaving] = useState(false);
  const [loadingFilename, setLoadingFilename] = useState('');
  const [savedCheckpoints, setSavedCheckpoints] = useState([]);
  const [loadingList, setLoadingList] = useState(true);

  const fetchSavedList = async () => {
    setLoadingList(true);
    try {
      const res = await api.getSavedIndexes();
      setSavedCheckpoints(res.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    let active = true;
    api.getSavedIndexes()
      .then((res) => {
        if (active) setSavedCheckpoints(res.items || []);
      })
      .catch((err) => console.error(err))
      .finally(() => {
        if (active) setLoadingList(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleSave = async () => {
    if (!saveName.trim()) return;
    setIsSaving(true);
    try {
      const res = await api.saveIndex(saveName.trim());
      if (onNotify) {
        onNotify('success', 'Checkpoint Serialized', res.message);
      }
      fetchSavedList();
    } catch (err) {
      if (onNotify) {
        onNotify('error', 'Save Failed', err.message || 'Error saving index to disk.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoad = async (filename) => {
    setLoadingFilename(filename);
    try {
      const res = await api.loadSavedIndex(filename);
      if (onIndexLoaded) {
        onIndexLoaded(res, filename);
      }
    } catch (err) {
      if (onNotify) {
        onNotify('error', 'Restore Failed', err.message || 'Error loading checkpoint.');
      }
    } finally {
      setLoadingFilename('');
    }
  };

  return (
    <div className="studio-card studio-card-hover p-6 sm:p-7 relative overflow-hidden">
      {/* Top Accent */}
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-500 via-indigo-500 to-emerald-500 opacity-85" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200/80 flex items-center justify-center shrink-0 shadow-2xs">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200/60">
                STAGE 05
              </span>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Disk Serialization &amp; Phase 2 Persistence Bridge
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Persist multi-model indexes to local disk (`.json` + `.pkl`) for zero-latency Phase 2 query matching
            </p>
          </div>
        </div>

        <button
          onClick={fetchSavedList}
          disabled={loadingList}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors border border-slate-200 shadow-2xs cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loadingList ? 'animate-spin' : ''}`} />
          Refresh Registry
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Save Active Index (5 cols) */}
        <div className="lg:col-span-5 studio-well p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <h3 className="text-sm font-bold text-slate-900">Export Active Index</h3>
              <div className="flex items-center gap-1">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-mono text-slate-600">
                  <FileJson className="w-3 h-3 text-indigo-600" /> .json
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-mono text-slate-600">
                  <Binary className="w-3 h-3 text-violet-600" /> .pkl
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-3.5">
              Writes human-auditable JSON and fast binary Pickle snapshots to{' '}
              <code className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-indigo-700 font-mono text-[11px]">
                backend/data/saved_indexes/
              </code>
              .
            </p>

            {/* Pipeline Metadata Preview */}
            <div className="mb-3.5">
              <span className="text-[11px] font-semibold text-slate-500 block mb-1.5">
                Embedded Pipeline Metadata:
              </span>
              <div className="flex flex-wrap gap-1">
                {stepOrder.length > 0 ? (
                  stepOrder.map((step, i) => (
                    <span
                      key={step}
                      className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-mono text-slate-700"
                    >
                      {i + 1}.{step}
                    </span>
                  ))
                ) : (
                  <span className="text-[11px] text-slate-400 italic">Raw whitespace split</span>
                )}
              </div>
            </div>

            <label className="text-[11px] font-semibold text-slate-600 block mb-1.5">
              Checkpoint Name
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="reuters_index_v1"
                disabled={!isIndexed || isSaving}
                className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 disabled:opacity-50"
              />
              <button
                onClick={handleSave}
                disabled={!isIndexed || isSaving || !saveName.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs shadow-indigo-600/20 cursor-pointer disabled:opacity-40"
              >
                <Save className="w-3.5 h-3.5" />
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>

            {!isIndexed && (
              <span className="text-[11px] text-amber-700 font-medium mt-2 block">
                Build or load an index first to enable disk serialization.
              </span>
            )}
          </div>

          {/* Phase 2 Compatibility Guarantee */}
          <div className="mt-5 p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200/80">
            <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              Phase 2 Query Engine Contract
            </div>
            <p className="text-[11px] text-indigo-900/75 leading-relaxed">
              Saved checkpoints freeze your exact NLP step sequence so Phase 2 user queries undergo identical preprocessing prior to Boolean or Vector-Space Cosine matching.
            </p>
          </div>
        </div>

        {/* Right Column: Saved Checkpoints Registry (7 cols) */}
        <div className="lg:col-span-7 studio-well p-5 flex flex-col">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-bold text-slate-900">Local Disk Checkpoint Registry</h3>
            <span className="text-[11px] font-mono text-slate-500 tabular-nums">
              {savedCheckpoints.length} {savedCheckpoints.length === 1 ? 'snapshot' : 'snapshots'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Restore any serialized index directly into active RAM without re-running corpus preprocessing.
          </p>

          {savedCheckpoints.length > 0 ? (
            <div className="space-y-2.5 max-h-[270px] overflow-y-auto pr-1">
              {savedCheckpoints.map((cp) => {
                const isRestoring = loadingFilename === cp.filename;
                const isActive =
                  activeCheckpointName &&
                  (activeCheckpointName === cp.filename || activeCheckpointName === cp.name);

                return (
                  <div
                    key={cp.filename}
                    className={`bg-white border rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                      isActive
                        ? 'border-emerald-300 ring-2 ring-emerald-500/10'
                        : 'border-slate-200/90 hover:border-indigo-300 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={`p-2 rounded-lg border shrink-0 mt-0.5 ${
                          isActive
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                            : 'bg-indigo-50 text-indigo-600 border-indigo-200/70'
                        }`}
                      >
                        <FileJson className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-slate-900 font-mono truncate">
                            {cp.name}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.2 rounded font-mono tabular-nums">
                            {(cp.size_bytes / 1024).toFixed(1)} KB
                          </span>
                          {isActive && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.2 rounded-full">
                              <CheckCircle2 className="w-2.5 h-2.5" /> Active
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-slate-500 mt-1 tabular-nums">
                          <span>
                            <strong className="text-slate-700">{cp.num_documents}</strong> docs
                          </span>
                          <span className="text-slate-300">&bull;</span>
                          <span>
                            <strong className="text-slate-700">{cp.vocabulary_size}</strong> terms
                          </span>
                          {cp.created_at && (
                            <>
                              <span className="text-slate-300">&bull;</span>
                              <span className="inline-flex items-center gap-1 text-slate-400">
                                <Clock className="w-3 h-3" />
                                {formatCheckpointDate(cp.created_at)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleLoad(cp.filename)}
                      disabled={Boolean(loadingFilename)}
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-50 hover:bg-indigo-50 text-xs font-semibold text-slate-700 hover:text-indigo-700 transition-all border border-slate-200 hover:border-indigo-200 cursor-pointer disabled:opacity-50 shrink-0"
                    >
                      {isRestoring ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                      ) : (
                        <FolderDown className="w-3.5 h-3.5 text-indigo-600" />
                      )}
                      {isRestoring ? 'Restoring...' : 'Restore'}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center py-10 px-4 text-center rounded-xl border border-dashed border-slate-300 bg-white/60 text-xs text-slate-400 font-mono">
              No saved checkpoints found in backend/data/saved_indexes/ yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
