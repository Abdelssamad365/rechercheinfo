/**
 * API Service for Search Engine Backend
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export async function apiRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Accept': 'application/json',
        ...(options.headers || {})
      }
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(errData.detail || `Request failed with status ${res.status}`);
    }

    return await res.json();
  } catch (error) {
    console.error(`API Error on ${endpoint}:`, error);
    throw error;
  }
}

export const api = {
  // Health
  checkHealth: () => apiRequest('/health'),

  // Dataset
  loadSample: () => apiRequest('/dataset/sample'),
  uploadFile: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiRequest('/dataset/upload', {
      method: 'POST',
      body: formData
    });
  },
  getDocuments: (page = 1, pageSize = 10) =>
    apiRequest(`/dataset/documents?page=${page}&page_size=${pageSize}`),
  getDocumentDetail: (docId) => apiRequest(`/dataset/documents/${docId}`),

  // Pipeline
  getSteps: () => apiRequest('/pipeline/steps'),
  previewPipeline: (text, stepOrder) =>
    apiRequest('/pipeline/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, step_order: stepOrder })
    }),

  // Indexing
  generateIndexes: (stepOrder) =>
    apiRequest('/index/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step_order: stepOrder })
    }),
  getMetrics: () => apiRequest('/index/metrics'),
  getMatrixSlice: (model = 'tfidf', matrixType = 'doc_term', page = 1, pageSize = 15, termFilter = '') => {
    const params = new URLSearchParams({
      model,
      matrix_type: matrixType,
      page: page.toString(),
      page_size: pageSize.toString(),
      term_filter: termFilter
    });
    return apiRequest(`/index/matrix?${params.toString()}`);
  },
  getPostings: (model = 'tfidf', query = '', page = 1, pageSize = 20) => {
    const params = new URLSearchParams({
      model,
      query,
      page: page.toString(),
      page_size: pageSize.toString()
    });
    return apiRequest(`/index/postings?${params.toString()}`);
  },

  // Export / Persistence
  saveIndex: (name) =>
    apiRequest('/export/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    }),
  getSavedIndexes: () => apiRequest('/export/saved-list'),
  loadSavedIndex: (filename) =>
    apiRequest('/export/load', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename })
    })
};

