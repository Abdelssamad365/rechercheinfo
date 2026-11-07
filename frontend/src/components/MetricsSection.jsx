import React from 'react';
import {
  BarChart3,
  Database,
  Cpu,
  HardDrive,
  Zap,
  TrendingDown,
  Hash,
  Lock,
  Sparkles
} from 'lucide-react';

export default function MetricsSection({
  metricsData,
  executionTime,
  totalTokens,
  onGenerateIndexes,
  isGenerating,
  docCount
}) {
  // Cohesive Pre-Indexing Locked State (prevents 1 -> 2 -> 5 numbering jump)
  if (!metricsData) {
    return (
      <div className="studio-card p-6 sm:p-7 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 border border-slate-200 flex items-center justify-center shrink-0">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                  STAGE 03
                </span>
                <h2 className="text-base sm:text-lg font-bold text-slate-800 tracking-tight">
                  Post-Indexing Metrics &amp; Deep RAM Benchmark
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Run index generation in Stage 02 to unlock vocabulary dimensionality (`|V|`), token statistics, and recursive memory footprints (`sys.getsizeof`).
              </p>
            </div>
          </div>

          <button
            onClick={onGenerateIndexes}
            disabled={isGenerating || docCount === 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100/80 text-indigo-700 border border-indigo-200 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 self-start md:self-auto shrink-0"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
            {isGenerating ? 'Generating...' : 'Generate Indexes to Unlock'}
          </button>
        </div>
      </div>
    );
  }

  const {
    num_documents = 0,
    vocabulary_size = 0,
    total_matrices_formatted = '0 B',
    total_inverted_formatted = '0 B',
    total_matrices_bytes = 1,
    total_inverted_bytes = 1,
    global_savings_percent = 0,
    models_breakdown = {}
  } = metricsData;

  const maxBytes = Math.max(total_matrices_bytes, total_inverted_bytes) || 1;
  const matrixWidth = Math.max(4, Math.round((total_matrices_bytes / maxBytes) * 100));
  const invertedWidth = Math.max(4, Math.round((total_inverted_bytes / maxBytes) * 100));
  const avgTokensPerDoc =
    totalTokens > 0 && num_documents > 0 ? Math.round(totalTokens / num_documents) : null;

  return (
    <div className="studio-card studio-card-hover p-6 sm:p-7 relative overflow-hidden">
      {/* Top Emerald-Indigo Accent */}
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-500 opacity-85" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/80 flex items-center justify-center shrink-0 shadow-2xs">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/70">
                STAGE 03
              </span>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Post-Indexing Metrics &amp; Deep RAM Benchmark
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Vocabulary dimensionality, corpus token volume, and true recursive RAM comparison
            </p>
          </div>
        </div>

        {executionTime > 0 && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-700 text-xs font-mono font-semibold tabular-nums self-start sm:self-auto">
            <Zap className="w-3.5 h-3.5 text-indigo-600" />
            <span>Build Time: {executionTime} ms</span>
          </div>
        )}
      </div>

      {/* 5-Card Executive Bento KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4 mb-6">
        {/* KPI 1: Vocabulary Size */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1.5">
            <span>Vocabulary (|V|)</span>
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <Database className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums">
            {vocabulary_size.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-500">Unique indexed terms</span>
        </div>

        {/* KPI 2: Document Count */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1.5">
            <span>Documents (N)</span>
            <div className="p-1.5 rounded-lg bg-violet-50 text-violet-600">
              <Cpu className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums">
            {num_documents.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-500">Parsed corpus records</span>
        </div>

        {/* KPI 3: Processed Tokens */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1.5">
            <span>Processed Tokens</span>
            <div className="p-1.5 rounded-lg bg-sky-50 text-sky-600">
              <Hash className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums">
            {totalTokens > 0 ? totalTokens.toLocaleString() : '—'}
          </div>
          <span className="text-[11px] text-slate-500">
            {avgTokensPerDoc ? `~${avgTokensPerDoc} tokens / doc` : 'Restored from checkpoint'}
          </span>
        </div>

        {/* KPI 4: Dense Matrices RAM */}
        <div className="bg-amber-50/45 border border-amber-200/90 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-amber-800 text-xs font-semibold mb-1.5">
            <span>Dense Matrices</span>
            <div className="p-1.5 rounded-lg bg-amber-100/80 text-amber-700">
              <HardDrive className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-amber-800 font-mono tabular-nums">
            {total_matrices_formatted}
          </div>
          <span className="text-[11px] text-amber-700/80">Doc-Term + Term-Doc</span>
        </div>

        {/* KPI 5: Inverted Lists RAM */}
        <div className="col-span-2 lg:col-span-1 bg-emerald-50/55 border border-emerald-200/95 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-800 text-xs font-semibold mb-1.5">
            <span>Inverted Lists</span>
            <div className="p-1.5 rounded-lg bg-emerald-100/80 text-emerald-700">
              <TrendingDown className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-emerald-800 font-mono tabular-nums">
            {total_inverted_formatted}
          </div>
          <span className="text-[11px] font-bold text-emerald-700">
            -{global_savings_percent}% memory saved
          </span>
        </div>
      </div>

      {/* Visual Memory Comparison Bar Card */}
      <div className="studio-well p-5 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Memory Footprint Comparison: Dense Matrices vs. Sparse Posting Lists
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Inverted Lists omit zero-weight entries, exploiting natural Zipfian sparsity across all 4 models.
            </p>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-bold font-mono px-3 py-1 rounded-full bg-emerald-100/80 border border-emerald-200 text-emerald-800 tabular-nums self-start sm:self-auto">
            {global_savings_percent}% RAM Reduction
          </span>
        </div>

        <div className="space-y-4">
          {/* Dense Matrices Bar */}
          <div>
            <div className="flex justify-between items-baseline text-xs mb-1.5">
              <span className="font-semibold text-slate-700">
                Dense Matrices <span className="text-slate-400 font-normal">(Doc-Term &amp; Term-Doc &times; 4 models)</span>
              </span>
              <span className="font-mono font-bold text-amber-700 tabular-nums">
                {total_matrices_formatted}{' '}
                <span className="text-[10px] font-normal text-slate-400">
                  ({total_matrices_bytes.toLocaleString()} B)
                </span>
              </span>
            </div>
            <div className="w-full h-3.5 bg-slate-200/75 rounded-full overflow-hidden p-0.5">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-700"
                style={{ width: `${matrixWidth}%` }}
              />
            </div>
          </div>

          {/* Inverted Lists Bar */}
          <div>
            <div className="flex justify-between items-baseline text-xs mb-1.5">
              <span className="font-semibold text-slate-700">
                Inverted Posting Lists <span className="text-slate-400 font-normal">(Non-zero `(doc_id, weight)` pairs &times; 4 models)</span>
              </span>
              <span className="font-mono font-bold text-emerald-700 tabular-nums">
                {total_inverted_formatted}{' '}
                <span className="text-[10px] font-normal text-slate-400">
                  ({total_inverted_bytes.toLocaleString()} B)
                </span>
              </span>
            </div>
            <div className="w-full h-3.5 bg-slate-200/75 rounded-full overflow-hidden p-0.5">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-700"
                style={{ width: `${invertedWidth}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Model-by-Model RAM Breakdown Table with Inline Proportion Bars */}
      <div>
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5 px-1">
          Per-Model Memory Breakdown
        </h4>
        <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-2xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-mono text-[11px] uppercase">
              <tr>
                <th className="py-3 px-4">Weighting Model</th>
                <th className="py-3 px-4">Doc-Term Matrix</th>
                <th className="py-3 px-4">Term-Doc Matrix</th>
                <th className="py-3 px-4">Inverted Index</th>
                <th className="py-3 px-4 w-44 hidden md:table-cell">Dense vs. Sparse</th>
                <th className="py-3 px-4 text-right">Savings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-slate-700 tabular-nums">
              {Object.entries(models_breakdown).map(([key, data]) => {
                const rowMax = Math.max(data.total_matrix_bytes || 1, data.inverted_index_bytes || 1);
                const densePct = Math.max(6, Math.round(((data.total_matrix_bytes || 0) / rowMax) * 100));
                const sparsePct = Math.max(6, Math.round(((data.inverted_index_bytes || 0) / rowMax) * 100));

                return (
                  <tr key={key} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-sans font-bold text-slate-900">{data.name}</td>
                    <td className="py-3 px-4 text-slate-600">{data.doc_term_formatted}</td>
                    <td className="py-3 px-4 text-slate-600">{data.term_doc_formatted}</td>
                    <td className="py-3 px-4 text-emerald-700 font-bold">
                      {data.inverted_index_formatted}
                    </td>
                    <td className="py-3 px-4 hidden md:table-cell">
                      <div className="space-y-1">
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-400 rounded-full"
                            style={{ width: `${densePct}%` }}
                          />
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full"
                            style={{ width: `${sparsePct}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-[11px]">
                        -{data.savings_ratio}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
