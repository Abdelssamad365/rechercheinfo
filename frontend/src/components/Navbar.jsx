import React from 'react';
import { Database, Cpu, HardDrive, CheckCircle2, Sparkles } from 'lucide-react';

export default function Navbar({ datasetName, docCount, isIndexed, vocabSize }) {
  return (
    <header className="border-b border-gray-800 bg-[#0d1322]/80 backdrop-blur-md sticky top-0 z-50 px-6 py-3.5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-1 ring-white/20">
            <Cpu className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-lg text-white tracking-tight">ReutersIR Studio</h1>
              <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Phase 1 Admin
              </span>
            </div>
            <p className="text-xs text-gray-400">Intelligent Search Engine Core & Multi-Model Indexer</p>
          </div>
        </div>

        {/* Live System Badges */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          {/* Dataset Pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-900 border border-gray-800 text-gray-300">
            <Database className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-gray-400">Dataset:</span>
            <span className="font-medium text-white max-w-[150px] truncate">{datasetName}</span>
            {docCount > 0 && (
              <span className="px-1.5 py-0.2 bg-gray-800 text-indigo-300 text-[11px] rounded font-mono">
                {docCount} docs
              </span>
            )}
          </div>

          {/* Engine Status Pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-900 border border-gray-800">
            <span className={`w-2 h-2 rounded-full ${isIndexed ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span className="text-gray-400">Index:</span>
            <span className={`font-medium ${isIndexed ? 'text-emerald-400' : 'text-amber-400'}`}>
              {isIndexed ? `${vocabSize} Terms Loaded` : 'Ready to Generate'}
            </span>
          </div>

          {/* Phase 2 Ready Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-medium">Phase 2 Client Ready</span>
          </div>
        </div>

      </div>
    </header>
  );
}

