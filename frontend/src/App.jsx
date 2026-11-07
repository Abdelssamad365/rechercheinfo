import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import DatasetSection from './components/DatasetSection';
import PipelineSection from './components/PipelineSection';
import MetricsSection from './components/MetricsSection';
import IndexExplorer from './components/IndexExplorer';
import ExportSection from './components/ExportSection';
import ToastContainer from './components/ToastContainer';
import DocumentQuickPeek from './components/DocumentQuickPeek';
import { api } from './services/api';

const DEFAULT_PLAYGROUND_TEXT = `<REUTERS><TITLE>BAHIA COCOA TRADERS</TITLE><BODY>The 15 Brazilian exporters were selling cocoa beans quickly, while European buyers bought 180,000 bags from the banks!</BODY></REUTERS>`;

export default function App() {
  const [datasetName, setDatasetName] = useState('Reuters-21578 Sample (20 Documents)');
  const [docCount, setDocCount] = useState(20);
  const [backendOnline, setBackendOnline] = useState(false);

  const [stepOrder, setStepOrder] = useState([
    'tag_cleaning',
    'normalisation',
    'stopwords_removal',
    'stemming'
  ]);

  const [playgroundText, setPlaygroundText] = useState(DEFAULT_PLAYGROUND_TEXT);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isIndexed, setIsIndexed] = useState(false);
  const [vocabSize, setVocabSize] = useState(0);
  const [metricsData, setMetricsData] = useState(null);
  const [executionTime, setExecutionTime] = useState(0);
  const [totalTokens, setTotalTokens] = useState(0);
  const [appLoading, setAppLoading] = useState(false);
  const [activeCheckpointName, setActiveCheckpointName] = useState('');

  // Workspace navigation state
  const [viewMode, setViewMode] = useState('scroll'); // 'scroll' | 'tabs'
  const [activeStage, setActiveStage] = useState('corpus');

  // Floating Toasts & Document Quick-Peek Slide-over
  const [toasts, setToasts] = useState([]);
  const [quickPeek, setQuickPeek] = useState(null);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((type, title, text) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev.slice(-3), { id, type, title, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4600);
  }, []);

  // Navigate to a specific stage smoothly
  const navigateToStage = useCallback(
    (stageId) => {
      setActiveStage(stageId);
      if (viewMode === 'scroll') {
        requestAnimationFrame(() => {
          const el = document.getElementById(`section-${stageId}`);
          if (el) {
            const y = el.getBoundingClientRect().top + window.scrollY - 128;
            window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
          }
        });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    [viewMode]
  );

  // Hydrate backend health + restore existing in-memory index on page load/refresh
  useEffect(() => {
    api.checkHealth()
      .then(async (data) => {
        setBackendOnline(true);
        if (data.num_documents > 0) {
          setDocCount(data.num_documents);
          setDatasetName(data.dataset_loaded || 'Reuters-21578 Sample');
        }
        if (data.has_index) {
          try {
            const existing = await api.getMetrics();
            setIsIndexed(true);
            setMetricsData(existing.metrics);
            setVocabSize(existing.vocabulary_size || existing.metrics?.vocabulary_size || 0);
            setExecutionTime(existing.execution_time_ms || 0);
            if (existing.pipeline_steps?.length) {
              setStepOrder(existing.pipeline_steps);
            }
          } catch (e) {
            console.warn('Could not hydrate active index metrics:', e);
          }
        }
      })
      .catch((err) => {
        setBackendOnline(false);
        console.warn('Backend server not yet ready:', err);
      });
  }, []);

  // Track active section while scrolling in Studio Scroll mode
  useEffect(() => {
    if (viewMode !== 'scroll') return;

    const ids = ['corpus', 'pipeline', 'metrics', 'explorer', 'export'];
    const handleScroll = () => {
      const offset = 180;
      for (let i = ids.length - 1; i >= 0; i--) {
        const el = document.getElementById(`section-${ids[i]}`);
        if (el && el.getBoundingClientRect().top <= offset) {
          setActiveStage(ids[i]);
          return;
        }
      }
      setActiveStage('corpus');
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [viewMode]);

  // Trigger Multi-Model Index Generation
  const handleGenerateIndexes = async () => {
    setIsGenerating(true);
    try {
      const res = await api.generateIndexes(stepOrder);
      setIsIndexed(true);
      setBackendOnline(true);
      setVocabSize(res.vocabulary_size);
      setMetricsData(res.metrics);
      setExecutionTime(res.execution_time_ms);
      setTotalTokens(res.total_tokens_processed);
      setActiveCheckpointName('');

      addToast(
        'success',
        'Multi-Model Indexing Complete',
        `Built BoW, F, TF & TF-IDF indexes (${res.vocabulary_size.toLocaleString()} terms across ${res.num_documents} docs) in ${res.execution_time_ms} ms.`
      );

      navigateToStage('metrics');
    } catch (err) {
      addToast('error', 'Indexing Failed', err.message || 'Error generating indexes.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDatasetLoaded = (name, count) => {
    setDatasetName(name);
    setDocCount(count);
    setBackendOnline(true);
    setIsIndexed(false);
    setMetricsData(null);
    setVocabSize(0);
    setTotalTokens(0);
    setActiveCheckpointName('');
    addToast(
      'success',
      'Corpus Ingested',
      `Loaded ${count} documents from "${name}". Configure your NLP pipeline to build indexes.`
    );
  };

  const handleSendDocToPipeline = useCallback(
    (docText) => {
      if (!docText) return;
      const snippet = docText.length > 900 ? `${docText.slice(0, 900)}...` : docText;
      setPlaygroundText(snippet);
      navigateToStage('pipeline');
      addToast(
        'info',
        'Loaded into NLP Dry-Run Tester',
        'Document snippet transferred to Stage 2 live playground.'
      );
    },
    [navigateToStage, addToast]
  );

  const handleIndexLoadedFromDisk = (loadRes, filename) => {
    setIsIndexed(true);
    setBackendOnline(true);
    setMetricsData(loadRes.metrics);
    setVocabSize(loadRes.metrics.vocabulary_size);
    setDocCount(loadRes.metrics.num_documents);
    if (loadRes.metadata?.name) {
      setDatasetName(`Checkpoint: ${loadRes.metadata.name}`);
      setActiveCheckpointName(filename || loadRes.metadata.name);
    }
    if (loadRes.metadata?.pipeline_steps) {
      setStepOrder(loadRes.metadata.pipeline_steps);
    }
    addToast(
      'success',
      'Checkpoint Restored',
      `Loaded "${loadRes.metadata?.name || filename}" (${loadRes.metrics.vocabulary_size} terms) into active memory.`
    );
  };

  const shouldRender = (stageId) => viewMode === 'scroll' || activeStage === stageId;

  return (
    <div className="min-h-screen studio-canvas text-slate-900 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Sticky Frosted Navigation & Workflow Rail */}
      <Navbar
        datasetName={datasetName}
        docCount={docCount}
        isIndexed={isIndexed}
        vocabSize={vocabSize}
        backendOnline={backendOnline}
        activeStepCount={stepOrder.length}
        viewMode={viewMode}
        setViewMode={setViewMode}
        activeStage={activeStage}
        onSelectStage={navigateToStage}
      />

      {/* Main Studio Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-7">
        {/* 1. Dataset Ingestion & Corpus Explorer */}
        {shouldRender('corpus') && (
          <section id="section-corpus" className="scroll-mt-32">
            <DatasetSection
              datasetName={datasetName}
              docCount={docCount}
              onDatasetLoaded={handleDatasetLoaded}
              onSendToPipeline={handleSendDocToPipeline}
              onNotify={addToast}
              loading={appLoading}
              setLoading={setAppLoading}
            />
          </section>
        )}

        {/* 2. Dynamic NLP Pipeline Studio */}
        {shouldRender('pipeline') && (
          <section id="section-pipeline" className="scroll-mt-32">
            <PipelineSection
              stepOrder={stepOrder}
              setStepOrder={setStepOrder}
              testText={playgroundText}
              setTestText={setPlaygroundText}
              onGenerateIndexes={handleGenerateIndexes}
              isGenerating={isGenerating}
              docCount={docCount}
            />
          </section>
        )}

        {/* 3. Post-Indexing Metrics & Deep RAM Benchmark */}
        {shouldRender('metrics') && (
          <section id="section-metrics" className="scroll-mt-32">
            <MetricsSection
              metricsData={metricsData}
              executionTime={executionTime}
              totalTokens={totalTokens}
              onGenerateIndexes={handleGenerateIndexes}
              isGenerating={isGenerating}
              docCount={docCount}
            />
          </section>
        )}

        {/* 4. Multi-Model Index & Heatmap Structures Explorer */}
        {shouldRender('explorer') && (
          <section id="section-explorer" className="scroll-mt-32">
            <IndexExplorer
              isIndexed={isIndexed}
              docCount={docCount}
              onGenerateIndexes={handleGenerateIndexes}
              isGenerating={isGenerating}
              onInspectDocument={(docId, highlightTerm, weight, modelLabel) =>
                setQuickPeek({ docId, highlightTerm, weight, modelLabel })
              }
            />
          </section>
        )}

        {/* 5. Disk Serialization & Phase 2 Persistence Bridge */}
        {shouldRender('export') && (
          <section id="section-export" className="scroll-mt-32">
            <ExportSection
              isIndexed={isIndexed}
              stepOrder={stepOrder}
              activeCheckpointName={activeCheckpointName}
              onIndexLoaded={handleIndexLoadedFromDisk}
              onNotify={addToast}
            />
          </section>
        )}
      </main>

      {/* Architectural Light Footer */}
      <footer className="border-t border-slate-200/90 bg-white/80 backdrop-blur-sm py-5 px-6 text-xs text-slate-500 mt-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-600" />
            <strong className="text-slate-800 font-semibold">ReutersIR Studio</strong>
            <span className="text-slate-300">&bull;</span>
            <span>Phase 1 — Information Retrieval Admin &amp; Indexer</span>
          </div>
          <div className="flex items-center gap-3 text-slate-500 font-mono text-[11px]">
            <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200/80 text-slate-600">
              From-Scratch Python IR Core
            </span>
            <span>FastAPI + React 19 + Tailwind v4</span>
          </div>
        </div>
      </footer>

      {/* Viewport-Pinned Floating Toasts */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Slide-Over Document Quick-Peek Drawer */}
      <DocumentQuickPeek
        peekInfo={quickPeek}
        onClose={() => setQuickPeek(null)}
        onSendToPipeline={handleSendDocToPipeline}
      />
    </div>
  );
}
