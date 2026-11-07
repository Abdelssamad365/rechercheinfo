import React from 'react';
import {
  Database,
  Cpu,
  CheckCircle2,
  Sparkles,
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
    <header className="sticky top-0 z-40 bg-white/88 backdrop-blur-xl border-b border-slate-200/90 shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
      {/* Primary Top Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Brand Identity */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-600 via-indigo-500 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-600/20 ring-1 ring-indigo-600/15 shrink-0">
            <Cpu className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight">
                ReutersIR Studio
              </h1>
              <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                Phase 1 Admin
              </span>
              <span
                title={backendOnline ? 'FastAPI Engine Connected' : 'Checking FastAPI Backend'}
                className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                  backendOnline
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                    : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    backendOnline ? 'bg-emerald-500' : 'bg-slate-400'
                  }`}
                />
                {backendOnline ? 'API Live' : 'Standby'}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Configurable NLP Pipeline, Multi-Model Vectorizer &amp; Deep RAM Profiler
            </p>
          </div>
        </div>

        {/* Live Telemetry & Layout Mode Switcher */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Active Dataset Telemetry Pill */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200/90 text-slate-700">
            <Database className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span className="text-slate-400 hidden sm:inline">Corpus:</span>
            <span className="font-semibold text-slate-800 max-w-[155px] truncate" title={datasetName}>
              {datasetName}
            </span>
            {docCount > 0 && (
              <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200/70 text-[11px] rounded font-mono font-semibold tabular-nums">
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
                isIndexed ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span className="font-semibold tabular-nums">
              {isIndexed ? `${vocabSize.toLocaleString()} Terms Indexed` : 'Awaiting Indexing'}
            </span>
          </div>

          {/* Workspace View Mode Switcher */}
          <div
            role="group"
            aria-label="Workspace layout mode"
            className="inline-flex bg-slate-100 p-0.5 rounded-lg border border-slate-200/90"
          >
            <button
              onClick={() => setViewMode('scroll')}
              title="Continuous Studio View (all sections visible)"
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                viewMode === 'scroll'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Rows3 className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">Studio</span>
            </button>
            <button
              onClick={() => setViewMode('tabs')}
              title="Focused Stage View (one module at a time)"
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                viewMode === 'tabs'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">Focused</span>
            </button>
          </div>
        </div>
      </div>

      {/* Interactive 5-Stage Workflow Stepper Rail */}
      <div className="border-t border-slate-100 bg-slate-50/65">
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
                        ? 'bg-white border-indigo-200 text-indigo-700 shadow-xs font-semibold'
                        : 'bg-transparent border-transparent text-slate-600 hover:bg-white/80 hover:border-slate-200/80 hover:text-slate-900'
                    }`}
                  >
                    <span
                      className={`inline-flex items-center justify-center w-5 h-5 rounded-md font-mono text-[10px] font-bold transition-colors ${
                        isActive
                          ? 'bg-indigo-600 text-white'
                          : done
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-200/80 text-slate-600 group-hover:bg-slate-200'
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
                        isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'
                      }`}
                    />
                    <span>{stage.label}</span>
                  </button>

                  {idx < WORKFLOW_STAGES.length - 1 && (
                    <div className="w-3 sm:w-5 h-px bg-slate-200 shrink-0" />
                  )}
                </React.Fragment>
              );
            })}

            <div className="ml-auto pl-3 hidden xl:flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 whitespace-nowrap">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Phase 2 Query Bridge Ready</span>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
