import React, { useState, useEffect } from 'react';
import { HardDrive, Save, RefreshCw, FolderDown, Sparkles, Check, FileJson } from 'lucide-react';
import { api } from '../services/api';

export default function ExportSection({ isIndexed, onIndexLoaded }) {
  const [saveName, setSaveName] = useState('reuters_phase1_index');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);
  const [savedCheckpoints, setSavedCheckpoints] = useState([]);
  const [loadingList, setLoadingList] = useState(false);

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
    fetchSavedList();
  }, []);

  const handleSave = async () => {
    if (!saveName.trim()) return;
    setIsSaving(true);
    setSaveMessage(null);
    try {
      const res = await api.saveIndex(saveName.trim());
      setSaveMessage({ type: 'success', text: res.message });
      fetchSavedList();
    } catch (err) {
      setSaveMessage({ type: 'error', text: err.message || 'Error saving index.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoad = async (filename) => {
    try {
      const res = await api.loadSavedIndex(filename);
      if (onIndexLoaded) {
        onIndexLoaded(res);
      }
      setSaveMessage({ type: 'success', text: `Loaded checkpoint: ${filename}` });
    } catch (err) {
      setSaveMessage({ type: 'error', text: err.message || 'Error loading index.' });
    }
  };

  return (
    <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <HardDrive className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white tracking-tight">5. Disk Serialization & Phase 2 Persistence Bridge</h2>
            <p className="text-xs text-gray-400">Save indexes to local disk (.json & .pkl) for instant loading in Phase 2 client search</p>
          </div>
        </div>

        <button
          onClick={fetchSavedList}
          disabled={loadingList}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 transition-colors border border-gray-700 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingList ? 'animate-spin' : ''}`} />
          Refresh List
        </button>
      </div>

      {saveMessage && (
        <div
          className={`mb-4 p-3 rounded-lg text-xs flex items-center gap-2 ${
            saveMessage.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
              : 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
          }`}
        >
          <Check className="w-4 h-4 shrink-0" />
          <span>{saveMessage.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Save Active Index */}
        <div className="lg:col-span-5 bg-gray-900/60 border border-gray-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white mb-1">Save Active Index to Disk</h3>
            <p className="text-xs text-gray-400 mb-3">
              Exports JSON (auditability) and binary Pickle (speed) to <code className="text-indigo-400 font-mono">backend/data/saved_indexes/</code>.
            </p>

            <label className="text-[11px] text-gray-400 font-mono block mb-1">Checkpoint Filename:</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="reuters_index_v1"
                disabled={!isIndexed || isSaving}
                className="flex-1 bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500 disabled:opacity-50"
              />
              <button
                onClick={handleSave}
                disabled={!isIndexed || isSaving}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-all shadow-md shadow-indigo-600/20 cursor-pointer disabled:opacity-40"
              >
                <Save className="w-3.5 h-3.5" />
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
            {!isIndexed && (
              <span className="text-[11px] text-amber-400 mt-2 block">
                Generate an index first before saving.
              </span>
            )}
          </div>

          {/* Phase 2 Anticipation Banner */}
          <div className="mt-5 p-3.5 rounded-lg bg-indigo-500/5 border border-indigo-500/20">
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-300 mb-1">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              Phase 2 Compatibility Guarantee
            </div>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Saved checkpoints include the exact NLP pipeline step order. In Phase 2, the Client Search Engine will automatically apply these exact preprocessing steps to user queries before Cosine Matching.
            </p>
          </div>
        </div>

        {/* Right Column: Checkpoints on Disk */}
        <div className="lg:col-span-7 bg-gray-900/60 border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-1">Saved Checkpoints on Local Disk</h3>
          <p className="text-xs text-gray-400 mb-3">
            Click 'Load Checkpoint' to instantly restore any index into memory without recalculation.
          </p>

          {savedCheckpoints.length > 0 ? (
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {savedCheckpoints.map((cp) => (
                <div
                  key={cp.filename}
                  className="bg-gray-950 border border-gray-800 hover:border-gray-700 rounded-lg p-3 flex items-center justify-between transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <FileJson className="w-4 h-4 text-indigo-400 shrink-0" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white font-mono">{cp.name}</span>
                        <span className="text-[10px] text-gray-400 bg-gray-900 px-1.5 py-0.2 rounded font-mono">
                          {(cp.size_bytes / 1024).toFixed(1)} KB
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-gray-500 mt-0.5">
                        <span>{cp.num_documents} docs</span>
                        <span>&bull;</span>
                        <span>{cp.vocabulary_size} terms</span>
                        <span>&bull;</span>
                        <span>{cp.created_at}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleLoad(cp.filename)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-indigo-300 font-mono transition-all border border-gray-700 cursor-pointer"
                  >
                    <FolderDown className="w-3.5 h-3.5" />
                    Load
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-gray-500 font-mono">
              No saved checkpoints found in backend/data/saved_indexes/ yet.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

