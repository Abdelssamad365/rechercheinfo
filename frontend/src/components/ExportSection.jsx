import React, { useState, useEffect } from 'react';
import {
  Save,
  RefreshCw,
  FolderDown,
  CheckCircle2,
  FileJson,
  Clock,
  Binary,
  ShieldCheck,
  Download,
  Upload,
  Trash2,
  X
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
  onCheckpointDeleted,
  onNotify
}) {
  const [saveName, setSaveName] = useState('reuters_index');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOverRegistry, setIsDragOverRegistry] = useState(false);

  const [loadingFilename, setLoadingFilename] = useState('');
  const [downloadingFilename, setDownloadingFilename] = useState('');
  const [deletingFilename, setDeletingFilename] = useState('');
  const [confirmDeleteFilename, setConfirmDeleteFilename] = useState('');

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

  // Auto-reset inline delete confirmation after 4s of inactivity
  useEffect(() => {
    if (!confirmDeleteFilename) return;
    const timer = setTimeout(() => setConfirmDeleteFilename(''), 4000);
    return () => clearTimeout(timer);
  }, [confirmDeleteFilename]);

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

  const handleDownload = async (filename) => {
    setDownloadingFilename(filename);
    try {
      const outName = await api.downloadSavedIndex(filename, 'json');
      if (onNotify) {
        onNotify('info', 'Download Started', `Exported "${outName}" to your computer.`);
      }
    } catch (err) {
      if (onNotify) {
        onNotify('error', 'Download Failed', err.message || 'Could not download checkpoint.');
      }
    } finally {
      setDownloadingFilename('');
    }
  };

  const importCheckpointFile = async (file) => {
    if (!file) return;
    setIsUploading(true);
    try {
      const res = await api.uploadIndexCheckpoint(file);
      if (onNotify) {
        onNotify('success', 'Index Uploaded', res.message);
      }
      await fetchSavedList();
    } catch (err) {
      if (onNotify) {
        onNotify('error', 'Upload Failed', err.message || 'Could not import index JSON file.');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleUploadChange = (e) => {
    const file = e.target.files?.[0];
    importCheckpointFile(file);
    e.target.value = '';
  };

  const handleRegistryDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverRegistry(false);
    if (isUploading) return;
    const file = e.dataTransfer.files?.[0];
    importCheckpointFile(file);
  };

  const handleDelete = async (cp) => {
    setDeletingFilename(cp.filename);
    try {
      const res = await api.deleteSavedIndex(cp.filename);
      setConfirmDeleteFilename('');
      setSavedCheckpoints((prev) => prev.filter((item) => item.filename !== cp.filename));
      if (onCheckpointDeleted) {
        onCheckpointDeleted(res.deleted || cp.name);
      }
      if (onNotify) {
        onNotify('info', 'Checkpoint Removed', res.message);
      }
    } catch (err) {
      if (onNotify) {
        onNotify('error', 'Delete Failed', err.message || 'Could not remove checkpoint.');
      }
    } finally {
      setDeletingFilename('');
    }
  };

  const isAnyRowBusy = Boolean(loadingFilename || downloadingFilename || deletingFilename);

  return (
    <div className="studio-card studio-card-hover p-6 sm:p-7">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-[11px] font-bold text-zinc-700 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
              05
            </span>
            <h2 className="text-base sm:text-lg font-bold text-zinc-950 tracking-tight">
              Disk Serialization &amp; Index Persistence
            </h2>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Persist multi-model indexes to local disk (.json + .pkl) for instant restoration and query matching
          </p>
        </div>

        <button
          onClick={fetchSavedList}
          disabled={loadingList}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white hover:bg-zinc-50 text-xs font-semibold text-zinc-700 transition-colors border border-zinc-200 shadow-2xs cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-zinc-500 ${loadingList ? 'animate-spin' : ''}`} />
          Refresh Registry
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Save Active Index */}
        <div className="lg:col-span-5 studio-well p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <h3 className="text-sm font-bold text-zinc-950">Export Active Index</h3>
              <div className="flex items-center gap-1">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-zinc-200 text-[10px] font-mono text-zinc-600">
                  <FileJson className="w-3 h-3 text-zinc-600" /> .json
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-zinc-200 text-[10px] font-mono text-zinc-600">
                  <Binary className="w-3 h-3 text-zinc-600" /> .pkl
                </span>
              </div>
            </div>

            <p className="text-xs text-zinc-600 leading-relaxed mb-3.5">
              Writes human-auditable JSON and fast binary Pickle snapshots to{' '}
              <code className="px-1.5 py-0.5 rounded bg-white border border-zinc-200 text-zinc-800 font-mono text-[11px]">
                backend/data/saved_indexes/
              </code>
              .
            </p>

            {/* Pipeline Metadata Preview */}
            <div className="mb-3.5">
              <span className="text-[11px] font-semibold text-zinc-500 block mb-1.5">
                Embedded Pipeline Metadata:
              </span>
              <div className="flex flex-wrap gap-1">
                {stepOrder.length > 0 ? (
                  stepOrder.map((step, i) => (
                    <span
                      key={step}
                      className="px-2 py-0.5 rounded bg-white border border-zinc-200 text-[10px] font-mono text-zinc-700"
                    >
                      {i + 1}.{step}
                    </span>
                  ))
                ) : (
                  <span className="text-[11px] text-zinc-400 italic">Raw whitespace split</span>
                )}
              </div>
            </div>

            <label className="text-[11px] font-semibold text-zinc-600 block mb-1.5">
              Checkpoint Name
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="reuters_index_v1"
                disabled={!isIndexed || isSaving}
                className="flex-1 bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs text-zinc-900 font-mono focus:outline-none focus:border-zinc-900 disabled:opacity-50"
              />
              <button
                onClick={handleSave}
                disabled={!isIndexed || isSaving || !saveName.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold transition-all cursor-pointer disabled:opacity-40"
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

          {/* Query Pipeline Consistency Note */}
          <div className="mt-5 p-3.5 rounded-xl bg-white border border-zinc-200">
            <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-900 mb-1">
              <ShieldCheck className="w-4 h-4 text-teal-700" />
              Query Preprocessing Consistency
            </div>
            <p className="text-[11px] text-zinc-600 leading-relaxed">
              Saved checkpoints freeze your exact NLP step sequence so search queries undergo identical preprocessing prior to Boolean or Vector-Space Cosine matching.
            </p>
          </div>
        </div>

        {/* Right Column: Local Disk Checkpoint Registry (Upload, Download, Restore, Remove) */}
        <div
          onDragEnter={(e) => {
            e.preventDefault();
            if (!isUploading) setIsDragOverRegistry(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            if (!isUploading) setIsDragOverRegistry(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            if (!e.currentTarget.contains(e.relatedTarget)) {
              setIsDragOverRegistry(false);
            }
          }}
          onDrop={handleRegistryDrop}
          className={`lg:col-span-7 studio-well p-5 flex flex-col transition-all ${
            isDragOverRegistry ? 'border-zinc-900 bg-zinc-100/80 ring-2 ring-zinc-900/10' : ''
          }`}
        >
          {/* Registry Header + Upload Index Button */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-zinc-950">Local Disk Checkpoint Registry</h3>
              <span className="text-[11px] font-mono text-zinc-500 bg-white border border-zinc-200 px-2 py-0.5 rounded tabular-nums">
                {savedCheckpoints.length} {savedCheckpoints.length === 1 ? 'snapshot' : 'snapshots'}
              </span>
            </div>

            <label
              title="Import an exported .json index file into the local registry"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-zinc-900 text-xs font-semibold text-zinc-800 hover:text-white border border-zinc-200 hover:border-zinc-900 shadow-2xs transition-all cursor-pointer ${
                isUploading ? 'opacity-50 pointer-events-none' : ''
              }`}
            >
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleUploadChange}
                disabled={isUploading}
                className="hidden"
              />
              {isUploading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}
              <span>{isUploading ? 'Importing...' : 'Upload Index'}</span>
            </label>
          </div>

          <p className="text-xs text-zinc-500 mb-4">
            {isDragOverRegistry
              ? 'Drop .json index file here to import into the registry...'
              : 'Restore into active RAM, download portable .json snapshots, or upload & manage checkpoints.'}
          </p>

          {savedCheckpoints.length > 0 ? (
            <div className="space-y-2.5 max-h-[285px] overflow-y-auto pr-1">
              {savedCheckpoints.map((cp) => {
                const isRestoring = loadingFilename === cp.filename;
                const isDownloading = downloadingFilename === cp.filename;
                const isDeleting = deletingFilename === cp.filename;
                const isConfirmingDelete = confirmDeleteFilename === cp.filename;
                const isActive =
                  activeCheckpointName &&
                  (activeCheckpointName === cp.filename || activeCheckpointName === cp.name);

                return (
                  <div
                    key={cp.filename}
                    className={`bg-white border rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                      isActive
                        ? 'border-emerald-400 ring-1 ring-emerald-500/20'
                        : 'border-zinc-200 hover:border-zinc-300 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={`p-2 rounded-lg border shrink-0 mt-0.5 ${
                          isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-zinc-100 text-zinc-600 border-zinc-200'
                        }`}
                      >
                        <FileJson className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-zinc-950 font-mono truncate">
                            {cp.name}
                          </span>
                          <span className="text-[10px] font-semibold text-zinc-600 bg-zinc-100 border border-zinc-200 px-1.5 py-0.2 rounded font-mono tabular-nums">
                            {(cp.size_bytes / 1024).toFixed(1)} KB
                          </span>
                          {isActive && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.2 rounded-full">
                              <CheckCircle2 className="w-2.5 h-2.5" /> Active
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-zinc-500 mt-1 tabular-nums">
                          <span>
                            <strong className="text-zinc-800">{cp.num_documents}</strong> docs
                          </span>
                          <span className="text-zinc-300">&bull;</span>
                          <span>
                            <strong className="text-zinc-800">{cp.vocabulary_size}</strong> terms
                          </span>
                          {cp.created_at && (
                            <>
                              <span className="text-zinc-300">&bull;</span>
                              <span className="inline-flex items-center gap-1 text-zinc-400">
                                <Clock className="w-3 h-3" />
                                {formatCheckpointDate(cp.created_at)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Row Action Cluster: Restore + Download + Remove */}
                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                      {isConfirmingDelete ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleDelete(cp)}
                            disabled={isDeleting}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {isDeleting ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                            <span>{isDeleting ? 'Removing...' : 'Confirm'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteFilename('')}
                            disabled={isDeleting}
                            title="Cancel removal"
                            className="p-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-600 transition-colors cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleLoad(cp.filename)}
                            disabled={isAnyRowBusy}
                            title="Restore checkpoint into active memory"
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-50 hover:bg-zinc-900 text-xs font-semibold text-zinc-800 hover:text-white transition-all border border-zinc-200 hover:border-zinc-900 cursor-pointer disabled:opacity-50"
                          >
                            {isRestoring ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <FolderDown className="w-3.5 h-3.5" />
                            )}
                            <span>{isRestoring ? 'Restoring...' : 'Restore'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDownload(cp.filename)}
                            disabled={isAnyRowBusy}
                            title={`Download ${cp.name}.json`}
                            aria-label={`Download ${cp.name}`}
                            className="p-1.5 rounded-lg bg-zinc-50 hover:bg-zinc-100 text-zinc-600 hover:text-zinc-950 border border-zinc-200 hover:border-zinc-300 transition-all cursor-pointer disabled:opacity-50"
                          >
                            {isDownloading ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Download className="w-3.5 h-3.5" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => setConfirmDeleteFilename(cp.filename)}
                            disabled={isAnyRowBusy}
                            title={`Remove ${cp.name} from disk`}
                            aria-label={`Remove ${cp.name}`}
                            className="p-1.5 rounded-lg bg-white hover:bg-rose-50 text-zinc-400 hover:text-rose-600 border border-zinc-200 hover:border-rose-200 transition-all cursor-pointer disabled:opacity-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 py-10 px-4 text-center rounded-xl border border-dashed border-zinc-300 bg-white/60 text-xs text-zinc-400">
              <span className="font-mono">No saved checkpoints in backend/data/saved_indexes/</span>
              <span>Save an active index on the left or upload a .json snapshot above.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
