import React, { useState } from 'react';
import { Sliders, ArrowUp, ArrowDown, Play, CheckCircle2, RotateCcw, Sparkles, Terminal } from 'lucide-react';
import { api } from '../services/api';

const ALL_STEPS = [
  {
    id: "tag_cleaning",
    name: "Tag Cleaning",
    tagline: "Strips SGML/XML tags & entities",
    desc: "Manual state-machine dropping <...> tags and decoding &lt;, &gt;, &amp;, STX characters."
  },
  {
    id: "normalisation",
    name: "Normalisation & Tokenizer",
    tagline: "Lowercases, removes punctuation & splits",
    desc: "Converts text to lowercase, strips punctuation marks without regex, normalizes whitespace into word tokens."
  },
  {
    id: "stopwords_removal",
    name: "Stopwords Removal",
    tagline: "Drops high-frequency functional words",
    desc: "Filters out ~160 standard English stopwords (in, on, the, is, for) via O(1) hash set lookup."
  },
  {
    id: "stemming",
    name: "Stemming (Racinisation)",
    tagline: "Rule-based suffix stripping",
    desc: "Handcrafted Porter-style suffix rules (-sses -> -ss, -ies -> -y, -ing -> '', derivational affixes)."
  },
  {
    id: "lemmatization",
    name: "Lemmatization (Lemmatisation)",
    tagline: "Morphological dictionary lookup",
    desc: "Restores irregular forms (went -> go, bought -> buy, matrices -> matrix) and inflections."
  }
];

export default function PipelineSection({
  stepOrder,
  setStepOrder,
  onGenerateIndexes,
  isGenerating,
  docCount
}) {
  // Live test playground state
  const [testText, setTestText] = useState(
    `<REUTERS><TITLE>BAHIA COCOA TRADERS</TITLE><BODY>The 15 Brazilian exporters were selling cocoa beans quickly, while European buyers bought 180,000 bags from the banks!</BODY></REUTERS>`
  );
  const [traceResult, setTraceResult] = useState(null);
  const [isPreviewing, setIsPreviewing] = useState(false);

  // Reorder steps
  const moveStep = (index, direction) => {
    const newOrder = [...stepOrder];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newOrder.length) return;

    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIndex];
    newOrder[targetIndex] = temp;
    setStepOrder(newOrder);
  };

  // Toggle step inclusion
  const toggleStep = (stepId) => {
    if (stepOrder.includes(stepId)) {
      setStepOrder(stepOrder.filter(s => s !== stepId));
    } else {
      setStepOrder([...stepOrder, stepId]);
    }
  };

  // Reset to default textbook order
  const resetOrder = () => {
    setStepOrder(["tag_cleaning", "normalisation", "stopwords_removal", "stemming"]);
  };

  // Run live interactive preview
  const handleLivePreview = async () => {
    if (!testText.trim()) return;
    setIsPreviewing(true);
    try {
      const res = await api.previewPipeline(testText, stepOrder);
      setTraceResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsPreviewing(false);
    }
  };

  return (
    <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white tracking-tight">2. Dynamic NLP Pipeline Configuration</h2>
            <p className="text-xs text-gray-400">Toggle preprocessing steps & customize their execution sequence order</p>
          </div>
        </div>

        <button
          onClick={resetOrder}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 transition-colors border border-gray-700 self-start sm:self-auto cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5 text-gray-400" />
          Reset Standard Order
        </button>
      </div>

      {/* Pipeline Builder: Active Execution Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Reorderable Active Steps */}
        <div className="lg:col-span-7 space-y-2.5">
          <div className="flex items-center justify-between text-xs text-gray-400 px-1 mb-1">
            <span>Execution Sequence ({stepOrder.length} Active Steps)</span>
            <span>Controls</span>
          </div>

          {stepOrder.map((stepId, idx) => {
            const stepInfo = ALL_STEPS.find(s => s.id === stepId) || { name: stepId, desc: "" };
            return (
              <div
                key={stepId}
                className="bg-gray-900/90 border border-indigo-500/30 hover:border-indigo-500/60 rounded-xl p-3.5 flex items-center justify-between transition-all shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-mono font-bold text-xs">
                    {idx + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-white">{stepInfo.name}</span>
                      <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-1.5 py-0.2 rounded font-mono">
                        {stepInfo.tagline}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-1">{stepInfo.desc}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => moveStep(idx, -1)}
                    disabled={idx === 0}
                    title="Move earlier in sequence"
                    className="p-1.5 rounded bg-gray-800 hover:bg-gray-700 disabled:opacity-30 text-gray-300 hover:text-white transition-all cursor-pointer"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => moveStep(idx, 1)}
                    disabled={idx === stepOrder.length - 1}
                    title="Move later in sequence"
                    className="p-1.5 rounded bg-gray-800 hover:bg-gray-700 disabled:opacity-30 text-gray-300 hover:text-white transition-all cursor-pointer"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => toggleStep(stepId)}
                    title="Remove from pipeline"
                    className="ml-1 text-[11px] px-2 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 transition-all cursor-pointer"
                  >
                    Disable
                  </button>
                </div>
              </div>
            );
          })}

          {/* Inactive steps drawer */}
          {ALL_STEPS.filter(s => !stepOrder.includes(s.id)).length > 0 && (
            <div className="pt-2">
              <span className="text-[11px] text-gray-500 uppercase tracking-wider block mb-1.5 px-1">
                Inactive Operations (Click to Add to Pipeline):
              </span>
              <div className="flex flex-wrap gap-2">
                {ALL_STEPS.filter(s => !stepOrder.includes(s.id)).map(s => (
                  <button
                    key={s.id}
                    onClick={() => toggleStep(s.id)}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-gray-900 border border-gray-800 hover:border-indigo-500 text-gray-400 hover:text-white transition-all cursor-pointer"
                  >
                    <span>+ Add {s.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Live Dry-Run Playground */}
        <div className="lg:col-span-5 bg-gray-950 border border-gray-800/90 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-200">
                <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                Live Pipeline Dry-Run Tester
              </div>
              <span className="text-[10px] text-indigo-400 font-mono bg-indigo-500/10 px-2 py-0.5 rounded">
                Interactive Test
              </span>
            </div>

            <textarea
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
              rows={3}
              placeholder="Type or paste any text to test the NLP pipeline live..."
              className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-xs text-gray-200 focus:outline-none focus:border-indigo-500 font-mono resize-none leading-relaxed"
            />

            <button
              onClick={handleLivePreview}
              disabled={isPreviewing}
              className="mt-2 flex items-center justify-center gap-1.5 w-full py-1.5 px-3 rounded-lg bg-gray-800 hover:bg-gray-700 text-indigo-300 text-xs font-medium border border-gray-700 transition-all cursor-pointer"
            >
              <Play className="w-3 h-3 text-indigo-400 fill-indigo-400" />
              {isPreviewing ? 'Computing...' : 'Test Sequence Live'}
            </button>
          </div>

          {/* Trace Results Box */}
          {traceResult && (
            <div className="mt-3 pt-3 border-t border-gray-800 max-h-[160px] overflow-y-auto space-y-1.5 font-mono text-[11px]">
              <div className="text-[10px] text-gray-500 uppercase tracking-wider">Step-by-step trace:</div>
              {traceResult.trace.map((t, idx) => (
                <div key={idx} className="flex items-start gap-2 bg-gray-900/60 p-1.5 rounded">
                  <span className="text-indigo-400 font-bold shrink-0">{t.step_name}:</span>
                  <span className="text-gray-300 break-all">{t.preview}</span>
                </div>
              ))}
              <div className="p-1.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                <strong>Final Tokens ({traceResult.final_token_count}):</strong>{' '}
                {traceResult.final_tokens.join(' • ')}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Main Execution Button Bar */}
      <div className="mt-6 pt-5 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-xs text-gray-400">
          Ready to compute <strong className="text-white">4 Models</strong> (BoW, F, TF, TF-IDF) &times; <strong className="text-white">3 Formats</strong> (Doc-Term, Term-Doc, Inverted Lists).
        </div>

        <button
          onClick={onGenerateIndexes}
          disabled={isGenerating || docCount === 0}
          className="flex items-center justify-center gap-2 py-3 px-8 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 active:scale-[0.99] text-white text-sm font-semibold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
        >
          <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
          {isGenerating ? 'Computing Indexes & Measuring RAM...' : 'Generate All Indexes'}
        </button>
      </div>
    </div>
  );
}

