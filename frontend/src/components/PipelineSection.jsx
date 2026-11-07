import React, { useState, useEffect } from 'react';
import {
  Sliders,
  ArrowUp,
  ArrowDown,
  Play,
  RotateCcw,
  Sparkles,
  Terminal,
  GripVertical,
  Plus,
  X,
  AlertTriangle,
  ChevronDown,
  CheckCircle2
} from 'lucide-react';
import { api } from '../services/api';

const ALL_STEPS = [
  {
    id: 'tag_cleaning',
    name: 'Tag Cleaning',
    tagline: 'SGML / XML Stripper',
    desc: 'State-machine stripping <...> markup and decoding &lt;, &gt;, &amp;, STX entities.'
  },
  {
    id: 'normalisation',
    name: 'Normalisation & Tokenizer',
    tagline: 'Case + Punctuation + Split',
    desc: 'Lowercases text, strips punctuation without regex, and splits whitespace into tokens.'
  },
  {
    id: 'stopwords_removal',
    name: 'Stopwords Removal',
    tagline: 'O(1) Hash-Set Filter',
    desc: 'Eliminates ~160 high-frequency English functional words (the, in, of, for, were).'
  },
  {
    id: 'stemming',
    name: 'Stemming (Racinisation)',
    tagline: 'Porter Suffix Rules',
    desc: 'Applies rule-based suffix stripping (-sses -> -ss, -ies -> -y, -ing -> "", affixes).'
  },
  {
    id: 'lemmatization',
    name: 'Lemmatization (Lemmatisation)',
    tagline: 'Morphological Dictionary',
    desc: 'Maps irregular inflections to canonical lemmas (bought -> buy, went -> go, banks -> bank).'
  }
];

const PIPELINE_PRESETS = [
  {
    id: 'standard',
    label: 'Standard Stemming',
    steps: ['tag_cleaning', 'normalisation', 'stopwords_removal', 'stemming']
  },
  {
    id: 'lemma',
    label: 'Morphological Lemma',
    steps: ['tag_cleaning', 'normalisation', 'stopwords_removal', 'lemmatization']
  },
  {
    id: 'minimal',
    label: 'Minimal Tokenize',
    steps: ['tag_cleaning', 'normalisation']
  }
];

const TEST_SNIPPETS = [
  {
    label: 'SGML Cocoa Dispatch',
    text: `<REUTERS><TITLE>BAHIA COCOA TRADERS</TITLE><BODY>The 15 Brazilian exporters were selling cocoa beans quickly, while European buyers bought 180,000 bags from the banks!</BODY></REUTERS>`
  },
  {
    label: 'Irregular Morphology',
    text: `Corporate matrices showed that major oil companies went into negotiations and bought smaller refineries across markets.`
  },
  {
    label: 'Trade & Currencies',
    text: `<TITLE>U.S. DOLLAR &amp; GRAIN EXPORTS</TITLE><BODY>Analysts said wheat shipments rose 12.5% after central banks intervened.</BODY>`
  }
];

export default function PipelineSection({
  stepOrder,
  setStepOrder,
  testText,
  setTestText,
  onGenerateIndexes,
  isGenerating,
  docCount
}) {
  const [traceResult, setTraceResult] = useState(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [autoPreview, setAutoPreview] = useState(true);
  const [draggedIdx, setDraggedIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);

  // Move step via Up/Down buttons
  const moveStep = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= stepOrder.length) return;
    const updated = [...stepOrder];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);
    setStepOrder(updated);
  };

  // HTML5 Drag & Drop handlers
  const handleDragStart = (idx) => {
    setDraggedIdx(idx);
  };

  const handleDragOver = (e, idx) => {
    e.preventDefault();
    if (dragOverIdx !== idx) setDragOverIdx(idx);
  };

  const handleDrop = (e, targetIdx) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === targetIdx) {
      setDraggedIdx(null);
      setDragOverIdx(null);
      return;
    }
    const updated = [...stepOrder];
    const [moved] = updated.splice(draggedIdx, 1);
    updated.splice(targetIdx, 0, moved);
    setStepOrder(updated);
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  const toggleStep = (stepId) => {
    if (stepOrder.includes(stepId)) {
      setStepOrder(stepOrder.filter((s) => s !== stepId));
    } else {
      setStepOrder([...stepOrder, stepId]);
    }
  };

  const resetOrder = () => {
    setStepOrder(['tag_cleaning', 'normalisation', 'stopwords_removal', 'stemming']);
  };

  const runPreview = async (txt, steps) => {
    if (!txt || !txt.trim()) return;
    setIsPreviewing(true);
    try {
      const res = await api.previewPipeline(txt, steps);
      setTraceResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsPreviewing(false);
    }
  };

  // Debounced auto-preview when stepOrder or testText changes
  useEffect(() => {
    if (!autoPreview || !testText?.trim()) return;
    const timer = setTimeout(() => {
      runPreview(testText, stepOrder);
    }, 320);
    return () => clearTimeout(timer);
  }, [testText, stepOrder, autoPreview]);

  // Detect pedagogical pipeline sequence insights
  const getPipelineHint = () => {
    const normIdx = stepOrder.indexOf('normalisation');
    const tagIdx = stepOrder.indexOf('tag_cleaning');
    const stopIdx = stepOrder.indexOf('stopwords_removal');
    const stemIdx = stepOrder.indexOf('stemming');

    if (stepOrder.length === 0) {
      return 'No NLP steps active — raw whitespace splitting will be used.';
    }
    if (tagIdx !== -1 && normIdx !== -1 && tagIdx > normIdx) {
      return 'Order Insight: "Tag Cleaning" is placed after "Normalisation". Angle brackets (<, >) may be stripped as punctuation first, turning tag names like "reuters" or "body" into vocabulary tokens!';
    }
    if (stopIdx !== -1 && normIdx !== -1 && stopIdx < normIdx) {
      return 'Order Insight: "Stopwords Removal" runs before "Normalisation". Capitalized words like "The" or punctuated words may bypass lowercase stopword matching.';
    }
    if (stemIdx !== -1 && stopIdx !== -1 && stemIdx < stopIdx) {
      return 'Order Insight: "Stemming" runs before "Stopwords Removal". Stemmed stopwords (e.g. "were" -> "wer") may no longer match standard stopword dictionary entries.';
    }
    return null;
  };

  const orderHint = getPipelineHint();
  const inactiveSteps = ALL_STEPS.filter((s) => !stepOrder.includes(s.id));
  const rawWordCount = (testText || '').trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="studio-card studio-card-hover p-6 sm:p-7 relative overflow-hidden">
      {/* Top Accent */}
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 opacity-85" />

      {/* Header & Presets */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200/80 flex items-center justify-center shrink-0 shadow-2xs">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200/60">
                STAGE 02
              </span>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Dynamic NLP Pipeline Studio
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Drag or reorder preprocessing stages and inspect live token transformations before indexing
            </p>
          </div>
        </div>

        {/* Preset Pills & Reset */}
        <div className="flex flex-wrap items-center gap-1.5">
          {PIPELINE_PRESETS.map((preset) => {
            const isMatch =
              preset.steps.length === stepOrder.length &&
              preset.steps.every((s, i) => stepOrder[i] === s);

            return (
              <button
                key={preset.id}
                onClick={() => setStepOrder(preset.steps)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                  isMatch
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-semibold'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {preset.label}
              </button>
            );
          })}

          <button
            onClick={resetOrder}
            title="Reset to default IR textbook order"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/70 text-xs font-medium text-slate-700 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            Reset
          </button>
        </div>
      </div>

      {/* Main Split Studio: Left = Execution Flow, Right = Live Dry-Run Playground */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Visual Connected Pipeline Queue (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span className="font-semibold text-slate-700">
              Active Execution Sequence ({stepOrder.length} {stepOrder.length === 1 ? 'Step' : 'Steps'})
            </span>
            <span className="text-[11px] text-slate-400">Drag handle or use arrows to reorder</span>
          </div>

          {/* Pedagogical Sequence Hint Banner */}
          {orderHint && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/90 text-amber-800 text-xs flex items-start gap-2.5 leading-relaxed">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>{orderHint}</span>
            </div>
          )}

          {/* Active Step Cards */}
          <div className="space-y-1.5">
            {stepOrder.map((stepId, idx) => {
              const stepInfo = ALL_STEPS.find((s) => s.id === stepId) || {
                name: stepId,
                tagline: 'Step',
                desc: ''
              };
              const isDropTarget = dragOverIdx === idx && draggedIdx !== idx;

              return (
                <React.Fragment key={stepId}>
                  <div
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDragEnd={() => {
                      setDraggedIdx(null);
                      setDragOverIdx(null);
                    }}
                    onDrop={(e) => handleDrop(e, idx)}
                    className={`group bg-white border rounded-xl p-3.5 flex items-center justify-between gap-3 transition-all ${
                      isDropTarget
                        ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/30'
                        : 'border-slate-200/95 hover:border-indigo-300 shadow-2xs'
                    } ${draggedIdx === idx ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        title="Drag to reorder"
                        className="text-slate-300 group-hover:text-slate-500 cursor-grab active:cursor-grabbing shrink-0"
                      >
                        <GripVertical className="w-4 h-4" />
                      </div>

                      <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-mono font-bold text-xs shrink-0 shadow-2xs">
                        {idx + 1}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs sm:text-sm font-bold text-slate-900">
                            {stepInfo.name}
                          </span>
                          <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200/70 px-2 py-0.2 rounded-full font-mono">
                            {stepInfo.tagline}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                          {stepInfo.desc}
                        </p>
                      </div>
                    </div>

                    {/* Step Action Controls */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => moveStep(idx, -1)}
                        disabled={idx === 0}
                        title="Move up in pipeline"
                        className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200/80 disabled:opacity-30 text-slate-600 hover:text-slate-900 transition-all cursor-pointer"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => moveStep(idx, 1)}
                        disabled={idx === stepOrder.length - 1}
                        title="Move down in pipeline"
                        className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200/80 disabled:opacity-30 text-slate-600 hover:text-slate-900 transition-all cursor-pointer"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => toggleStep(stepId)}
                        title="Disable step"
                        className="ml-1 p-1.5 rounded-lg bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200/80 hover:border-rose-200 transition-all cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Flow Connector Arrow */}
                  {idx < stepOrder.length - 1 && (
                    <div className="flex justify-center -my-0.5 pointer-events-none">
                      <ChevronDown className="w-3.5 h-3.5 text-indigo-300" />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Available / Inactive Steps Tray */}
          {inactiveSteps.length > 0 && (
            <div className="pt-3 border-t border-slate-200/70">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-2 px-1">
                Available Modules (Click to Append):
              </span>
              <div className="flex flex-wrap gap-2">
                {inactiveSteps.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => toggleStep(s.id)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-indigo-50 border border-dashed border-slate-300 hover:border-indigo-400 text-slate-700 hover:text-indigo-700 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{s.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Auto-Reactive Live Dry-Run Playground (5 cols) */}
        <div className="lg:col-span-5 studio-well p-4 sm:p-5 flex flex-col justify-between">
          <div>
            {/* Playground Header */}
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                <Terminal className="w-4 h-4 text-indigo-600" />
                <span>Live Dry-Run Playground</span>
              </div>

              <label className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoPreview}
                  onChange={(e) => setAutoPreview(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Auto-trace</span>
              </label>
            </div>

            {/* Quick Sample Snippet Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
              {TEST_SNIPPETS.map((snip) => (
                <button
                  key={snip.label}
                  onClick={() => setTestText(snip.text)}
                  className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-white hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 border border-slate-200 hover:border-indigo-200 transition-colors cursor-pointer"
                >
                  {snip.label}
                </button>
              ))}
            </div>

            <textarea
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
              rows={3}
              placeholder="Paste raw SGML or text to inspect step-by-step transformations..."
              className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 font-mono resize-none leading-relaxed shadow-2xs"
            />

            {!autoPreview && (
              <button
                onClick={() => runPreview(testText, stepOrder)}
                disabled={isPreviewing}
                className="mt-2.5 inline-flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-xl bg-white hover:bg-indigo-50 text-indigo-700 text-xs font-semibold border border-indigo-200 transition-all shadow-2xs cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 text-indigo-600 fill-indigo-600" />
                {isPreviewing ? 'Tracing Pipeline...' : 'Run Pipeline Trace'}
              </button>
            )}
          </div>

          {/* Step-by-Step Transformation Trace */}
          {traceResult && (
            <div className="mt-4 pt-3.5 border-t border-slate-200/90 space-y-2.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-slate-500 uppercase tracking-wider">
                  Transformation Trace
                </span>
                <span className="font-mono text-slate-500 tabular-nums">
                  {rawWordCount} raw &rarr;{' '}
                  <strong className="text-emerald-700">{traceResult.final_token_count} tokens</strong>
                </span>
              </div>

              <div className="max-h-[175px] overflow-y-auto space-y-1.5 pr-1 font-mono text-[11px]">
                {traceResult.trace.map((t, idx) => (
                  <div
                    key={idx}
                    className="bg-white border border-slate-200/80 p-2 rounded-lg flex flex-col gap-0.5"
                  >
                    <span className="text-[10px] font-bold text-indigo-600">
                      {idx + 1}. {t.step_name}
                    </span>
                    <span className="text-slate-600 break-words leading-relaxed line-clamp-2">
                      {t.preview}
                    </span>
                  </div>
                ))}
              </div>

              {/* Final Indexed Token Chips */}
              <div className="p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200/90">
                <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-800 mb-1.5">
                  <span className="inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Emitted Vocabulary Tokens ({traceResult.final_token_count})
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                  {traceResult.final_tokens.length > 0 ? (
                    traceResult.final_tokens.map((tok, i) => (
                      <span
                        key={`${tok}-${i}`}
                        className="px-1.5 py-0.5 rounded bg-white border border-emerald-200 text-[11px] font-mono text-emerald-900"
                      >
                        {tok}
                      </span>
                    ))
                  ) : (
                    <span className="text-[11px] text-slate-400 italic">No tokens emitted</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Primary Execution Bar */}
      <div className="mt-6 pt-5 border-t border-slate-200/90 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gradient-to-r from-indigo-50/60 via-white to-violet-50/50 -mx-6 sm:-mx-7 -mb-6 sm:-mb-7 px-6 sm:px-7 py-4">
        <div className="text-xs text-slate-600 leading-relaxed text-center sm:text-left">
          Computes <strong className="text-slate-900 font-semibold">4 Weighting Models</strong>{' '}
          <span className="font-mono text-[11px] text-slate-500">(BoW, F, TF, TF-IDF)</span> &times;{' '}
          <strong className="text-slate-900 font-semibold">3 Structures</strong>{' '}
          <span className="font-mono text-[11px] text-slate-500">(Doc-Term, Term-Doc, Postings)</span>{' '}
          with recursive RAM profiling.
        </div>

        <button
          onClick={onGenerateIndexes}
          disabled={isGenerating || docCount === 0}
          className="inline-flex items-center justify-center gap-2.5 py-3 px-7 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 active:scale-[0.99] text-white text-sm font-bold shadow-md shadow-indigo-600/25 ring-1 ring-indigo-700/20 transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none shrink-0"
        >
          <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
          {isGenerating ? 'Building 12 Structures & Profiling RAM...' : 'Generate All Indexes'}
        </button>
      </div>
    </div>
  );
}
