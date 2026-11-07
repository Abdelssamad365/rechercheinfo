import React from 'react';
import {
  Database,
  CheckCircle2,
  BookOpen,
  Sliders,
  BarChart3,
  Layers,
  HardDrive,
  Rows3,
  LayoutGrid
} from 'lucide-react';

const WORKFLOW_STAGES = [
  { id: 'corpus', num: '01', label: 'Corpus Ingestion', icon: BookOpen },
  { id: 'pipeline', num: '02', label: 'NLP Pipeline', icon: Sliders },
  { id: 'metrics', num: '03', label: 'RAM Benchmarks', icon: BarChart3 },
  { id: 'explorer', num: '04', label: 'Index Explorer', icon: Layers },
  { id: 'export', num: '05', label: 'Persistence', icon: HardDrive }
];

export default function Navbar({
  datasetName,
  docCount,
  isIndexed,
  vocabSize,
  backendOnline,
  activeStepCount,
  viewMode,
  setViewMode,
  activeStage,
  onSelectStage
}) {
  const isStageDone = (id) => {
    if (id === 'corpus') return docCount > 0;
    if (id === 'pipeline') return activeStepCount > 0;
    if (id === 'metrics' || id === 'explorer') return isIndexed;
    return false;
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-zinc-200/90">
      {/* Primary Top Bar — Pure Typographic Brand, Zero Logo Box */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="font-bold text-base sm:text-lg text-zinc-950 tracking-tight">
              ReutersIR Studio
            </h1>
            <span
              title={backendOnline ? 'FastAPI Engine Connected' : 'Checking FastAPI Backend'}
              className={`inline-flex items-center gap-1.5 text-[10px] font-medium px-2 py-0.5 rounded-md border ${
                backendOnline
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200/90'
                  : 'bg-zinc-100 text-zinc-500 border-zinc-200'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  backendOnline ? 'bg-emerald-600' : 'bg-zinc-400'
                }`}
              />
              {backendOnline ? 'API Connected' : 'Standby'}
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            Information Retrieval Preprocessing, Multi-Model Vectorizer &amp; Memory Profiler
          </p>
        </div>

        {/* Live Telemetry & Layout Mode Switcher */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Active Dataset Telemetry Pill */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-700">
            <Database className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            <span className="text-zinc-400 hidden sm:inline">Corpus:</span>
            <span className="font-semibold text-zinc-900 max-w-[160px] truncate" title={datasetName}>
              {datasetName}
            </span>
            {docCount > 0 && (
              <span className="px-1.5 py-0.5 bg-white text-zinc-700 border border-zinc-200 text-[11px] rounded font-mono font-semibold tabular-nums">
                {docCount} docs
              </span>
            )}
          </div>

          {/* Active Index Telemetry Pill */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${
              isIndexed
                ? 'bg-emerald-50/80 border-emerald-200 text-emerald-800'
                : 'bg-amber-50/80 border-amber-200 text-amber-800'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isIndexed ? 'bg-emerald-600' : 'bg-amber-500'
              }`}
            />
            <span className="font-semibold tabular-nums">
              {isIndexed ? `${vocabSize.toLocaleString()} Terms Indexed` : 'Unindexed'}
            </span>
          </div>

          {/* Workspace View Mode Switcher */}
          <div
            role="group"
            aria-label="Workspace layout mode"
            className="inline-flex bg-zinc-100 p-0.5 rounded-lg border border-zinc-200"
          >
            <button
              onClick={() => setViewMode('scroll')}
              title="Continuous Studio View (all sections visible)"
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                viewMode === 'scroll'
                  ? 'bg-white text-zinc-900 shadow-2xs'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              <Rows3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Scroll</span>
            </button>
            <button
              onClick={() => setViewMode('tabs')}
              title="Focused Stage View (one module at a time)"
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                viewMode === 'tabs'
                  ? 'bg-white text-zinc-900 shadow-2xs'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Focused</span>
            </button>
          </div>
        </div>
      </div>

      {/* Interactive 5-Stage Workflow Stepper Rail */}
      <div className="border-t border-zinc-100 bg-zinc-50/75">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav
            aria-label="IR Indexing Workflow Stages"
            className="flex items-center gap-1 sm:gap-2 overflow-x-auto py-2 no-scrollbar"
          >
            {WORKFLOW_STAGES.map((stage, idx) => {
              const Icon = stage.icon;
              const done = isStageDone(stage.id);
              const isActive = activeStage === stage.id;

              return (
                <React.Fragment key={stage.id}>
                  <button
                    onClick={() => onSelectStage(stage.id)}
                    className={`group flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer border ${
                      isActive
                        ? 'bg-white border-zinc-300 text-zinc-950 shadow-2xs font-semibold'
                        : 'bg-transparent border-transparent text-zinc-600 hover:bg-white/80 hover:border-zinc-200 hover:text-zinc-900'
                    }`}
                  >
                    <span
                      className={`inline-flex items-center justify-center w-5 h-5 rounded-md font-mono text-[10px] font-bold transition-colors ${
                        isActive
                          ? 'bg-zinc-900 text-white'
                          : done
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-zinc-200/80 text-zinc-600 group-hover:bg-zinc-200'
                      }`}
                    >
                      {done && !isActive ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        stage.num
                      )}
                    </span>
                    <Icon
                      className={`w-3.5 h-3.5 hidden md:inline ${
                        isActive ? 'text-zinc-900' : 'text-zinc-400 group-hover:text-zinc-600'
                      }`}
                    />
                    <span>{stage.label}</span>
                  </button>

                  {idx < WORKFLOW_STAGES.length - 1 && (
                    <div className="w-3 sm:w-5 h-px bg-zinc-200 shrink-0" />
                  )}
                </React.Fragment>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
