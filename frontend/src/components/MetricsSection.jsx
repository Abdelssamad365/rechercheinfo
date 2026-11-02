import React from 'react';
import { BarChart3, Database, Cpu, HardDrive, Zap, TrendingDown } from 'lucide-react';

export default function MetricsSection({ metricsData, executionTime, totalTokens }) {
  if (!metricsData) return null;

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

  // Calculate ratio for relative visual bar width
  const maxBytes = Math.max(total_matrices_bytes, total_inverted_bytes) || 1;
  const matrixWidth = Math.round((total_matrices_bytes / maxBytes) * 100);
  const invertedWidth = Math.round((total_inverted_bytes / maxBytes) * 100);

  return (
    <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white tracking-tight">3. Post-Indexing Metrics & RAM Benchmark</h2>
            <p className="text-xs text-gray-400">Vocabulary dimension, document counts, and deep memory footprint comparison</p>
          </div>
        </div>

        {executionTime > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-mono">
            <Zap className="w-3.5 h-3.5" />
            <span>Latency: {executionTime} ms</span>
          </div>
        )}
      </div>

      {/* 4 Primary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        
        {/* Metric 1: Vocabulary Dimension */}
        <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-gray-400 text-xs mb-1">
            <span>Vocabulary Size (|V|)</span>
            <Database className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">{vocabulary_size.toLocaleString()}</div>
          <span className="text-[11px] text-gray-500">Unique terms extracted</span>
        </div>

        {/* Metric 2: Document Count */}
        <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-gray-400 text-xs mb-1">
            <span>Indexed Documents (N)</span>
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">{num_documents.toLocaleString()}</div>
          <span className="text-[11px] text-gray-500">Documents in corpus</span>
        </div>

        {/* Metric 3: Total Matrices RAM */}
        <div className="bg-gray-900/80 border border-amber-500/20 rounded-xl p-4">
          <div className="flex items-center justify-between text-gray-400 text-xs mb-1">
            <span>Matrices RAM (Dense)</span>
            <HardDrive className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400 font-mono">{total_matrices_formatted}</div>
          <span className="text-[11px] text-gray-500">Doc-Term + Term-Doc</span>
        </div>

        {/* Metric 4: Inverted Lists RAM */}
        <div className="bg-gray-900/80 border border-emerald-500/20 rounded-xl p-4">
          <div className="flex items-center justify-between text-gray-400 text-xs mb-1">
            <span>Inverted Lists RAM</span>
            <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono">{total_inverted_formatted}</div>
          <span className="text-[11px] text-emerald-400 font-medium">-{global_savings_percent}% memory saved</span>
        </div>

      </div>

      {/* Visual Memory Comparison Bar */}
      <div className="bg-gray-950 border border-gray-800 rounded-xl p-5 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div>
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
              Memory Footprint Comparison: Matrices vs. Inverted Lists
            </h4>
            <p className="text-[11px] text-gray-400">
              Inverted Posting Lists exploit corpus sparsity, saving memory and accelerating Phase 2 matching.
            </p>
          </div>
          <span className="text-xs font-bold font-mono px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
            {global_savings_percent}% RAM Reduction
          </span>
        </div>

        {/* Bar: Matrices */}
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs text-gray-300 mb-1">
              <span>Matrices (Doc-Term & Term-Doc for all 4 models)</span>
              <span className="font-mono text-amber-400">{total_matrices_formatted}</span>
            </div>
            <div className="w-full h-3 bg-gray-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-700"
                style={{ width: `${matrixWidth}%` }}
              />
            </div>
          </div>

          {/* Bar: Inverted Lists */}
          <div>
            <div className="flex justify-between text-xs text-gray-300 mb-1">
              <span>Inverted Lists (Posting Lists for all 4 models)</span>
              <span className="font-mono text-emerald-400">{total_inverted_formatted}</span>
            </div>
            <div className="w-full h-3 bg-gray-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-700"
                style={{ width: `${invertedWidth}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Model-by-Model RAM Breakdown Table */}
      <div>
        <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2 px-1">
          Memory Breakdown Per Weighting Model
        </h4>
        <div className="overflow-x-auto border border-gray-800 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-900 text-gray-400 border-b border-gray-800 font-mono">
              <tr>
                <th className="p-3">Model</th>
                <th className="p-3">Doc-Term Matrix</th>
                <th className="p-3">Term-Doc Matrix</th>
                <th className="p-3">Inverted Index</th>
                <th className="p-3 text-right">RAM Savings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800 font-mono text-gray-300">
              {Object.entries(models_breakdown).map(([key, data]) => (
                <tr key={key} className="hover:bg-gray-900/50">
                  <td className="p-3 font-semibold text-white">{data.name}</td>
                  <td className="p-3 text-gray-400">{data.doc_term_formatted}</td>
                  <td className="p-3 text-gray-400">{data.term_doc_formatted}</td>
                  <td className="p-3 text-emerald-400 font-semibold">{data.inverted_index_formatted}</td>
                  <td className="p-3 text-right text-emerald-400">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                      -{data.savings_ratio}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

