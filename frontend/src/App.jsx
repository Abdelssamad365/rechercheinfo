import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import DatasetSection from './components/DatasetSection';
import PipelineSection from './components/PipelineSection';
import MetricsSection from './components/MetricsSection';
import IndexExplorer from './components/IndexExplorer';
import ExportSection from './components/ExportSection';
import { api } from './services/api';

export default function App() {
  const [datasetName, setDatasetName] = useState('Reuters-21578 Sample (20 Documents)');
  const [docCount, setDocCount] = useState(20);
  const [stepOrder, setStepOrder] = useState([
    'tag_cleaning',
    'normalisation',
    'stopwords_removal',
    'stemming'
  ]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isIndexed, setIsIndexed] = useState(false);
  const [vocabSize, setVocabSize] = useState(0);
  const [metricsData, setMetricsData] = useState(null);
  const [executionTime, setExecutionTime] = useState(0);
  const [totalTokens, setTotalTokens] = useState(0);
  const [appLoading, setAppLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  // Auto-check backend on initial mount
  useEffect(() => {
    api.checkHealth()
      .then((data) => {
        if (data.num_documents > 0) {
          setDocCount(data.num_documents);
          setDatasetName(data.dataset_loaded || 'Reuters Sample');
        }
      })
      .catch((err) => {
        console.warn('Backend server not yet ready:', err);
      });
  }, []);

  // Trigger Index Generation
  const handleGenerateIndexes = async () => {
    setIsGenerating(true);
    setNotification(null);
    try {
      const res = await api.generateIndexes(stepOrder);
      setIsIndexed(true);
      setVocabSize(res.vocabulary_size);
      setMetricsData(res.metrics);
      setExecutionTime(res.execution_time_ms);
      setTotalTokens(res.total_tokens_processed);
      setNotification({
        type: 'success',
        text: `Successfully generated BoW, F, TF, and TF-IDF models for ${res.num_documents} documents in ${res.execution_time_ms} ms.`
      });
    } catch (err) {
      setNotification({
        type: 'error',
        text: err.message || 'Error generating indexes.'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDatasetLoaded = (name, count) => {
    setDatasetName(name);
    setDocCount(count);
    setIsIndexed(false);
    setMetricsData(null);
    setVocabSize(0);
  };

  const handleIndexLoadedFromDisk = (loadRes) => {
    setIsIndexed(true);
    setMetricsData(loadRes.metrics);
    setVocabSize(loadRes.metrics.vocabulary_size);
    setDocCount(loadRes.metrics.num_documents);
    if (loadRes.metadata?.pipeline_steps) {
      setStepOrder(loadRes.metadata.pipeline_steps);
    }
    setNotification({
      type: 'success',
      text: `Successfully loaded index '${loadRes.metadata?.name || 'checkpoint'}' from disk.`
    });
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-gray-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation Bar */}
      <Navbar
        datasetName={datasetName}
        docCount={docCount}
        isIndexed={isIndexed}
        vocabSize={vocabSize}
      />

      {/* Main Admin Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        
        {/* Toast / Notification Banner */}
        {notification && (
          <div
            className={`p-4 rounded-xl border text-xs flex items-center justify-between shadow-lg transition-all ${
              notification.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            <span>{notification.text}</span>
            <button
              onClick={() => setNotification(null)}
              className="text-gray-400 hover:text-white px-2 py-0.5"
            >
              &times;
            </button>
          </div>
        )}

        {/* 1. Dataset Ingestion & Explorer */}
        <DatasetSection
          datasetName={datasetName}
          docCount={docCount}
          onDatasetLoaded={handleDatasetLoaded}
          loading={appLoading}
          setLoading={setAppLoading}
        />

        {/* 2. Dynamic NLP Pipeline Configuration */}
        <PipelineSection
          stepOrder={stepOrder}
          setStepOrder={setStepOrder}
          onGenerateIndexes={handleGenerateIndexes}
          isGenerating={isGenerating}
          docCount={docCount}
        />

        {/* 3. Metrics & Deep RAM Benchmark */}
        <MetricsSection
          metricsData={metricsData}
          executionTime={executionTime}
          totalTokens={totalTokens}
        />

        {/* 4. Multi-Model Index & Structures Explorer */}
        <IndexExplorer isIndexed={isIndexed} />

        {/* 5. Serialization & Phase 2 Bridge */}
        <ExportSection
          isIndexed={isIndexed}
          onIndexLoaded={handleIndexLoadedFromDisk}
        />

      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800/80 bg-[#0d1322] py-6 px-6 text-xs text-gray-500 text-center">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <strong className="text-gray-300">Intelligent Search Engine</strong> &bull; Phase 1 (Module Administrateur)
          </div>
          <div className="flex items-center gap-4 text-gray-400 font-mono">
            <span>Pure Python IR Engine (From Scratch)</span>
            <span>&bull;</span>
            <span>FastAPI + Vite React</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
