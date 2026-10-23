import React, { useEffect, useRef, useState } from 'react';
import { Upload, FileText, Play, Loader2, CheckCircle2, AlertCircle, Trash2, ExternalLink } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const DEFAULT_API_KEY = import.meta.env.VITE_API_KEY || '';

export default function App() {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [modelId, setModelId] = useState('prebuilt-layout');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [activeTab, setActiveTab] = useState('markdown');
  const fileInputRef = useRef(null);
  const requestRef = useRef(null);
  const isPdf = file && (file.type === 'application/pdf' || /\.pdf$/i.test(file.name));

  useEffect(() => {
    if (!file || (!file.type.startsWith('image/') && !/\.(pdf|png|jpe?g|tiff?)$/i.test(file.name))) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => () => requestRef.current?.abort(), []);

  const clearAnalysis = () => {
    requestRef.current?.abort();
    requestRef.current = null;
    setLoading(false);
    setResult(null);
    setError('');
    setActiveTab('markdown');
    setPreviewUrl(null);
  };

  const handleRemoveFile = () => {
    clearAnalysis();
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    clearAnalysis();
    if (selected.size > 50 * 1024 * 1024 || !/\.(pdf|png|jpe?g|tiff?)$/i.test(selected.name)) {
      setFile(null);
      e.target.value = '';
      setError('Choose a PDF, PNG, JPEG, or TIFF file up to 50 MB.');
      return;
    }
    setFile(selected);
  };

  const handleAnalyze = async () => {
    if (!file || requestRef.current) return;
    const controller = new AbortController();
    requestRef.current = controller;
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('model_id', modelId);

      const response = await fetch(`${API_BASE_URL}/api/v1/ocr/analyze`, {
        method: 'POST',
        headers: DEFAULT_API_KEY ? { 'X-API-Key': DEFAULT_API_KEY } : {},
        body: formData,
        signal: controller.signal,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Server responded with ${response.status}`);
      }

      const data = await response.json();
      if (!controller.signal.aborted) setResult(data);
    } catch (err) {
      if (!controller.signal.aborted) setError(err.message);
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null;
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-3 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-4">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-white">Azure AI Foundry — Document OCR</h1>
            <p className="text-xs text-slate-400 break-all">Connected to: {API_BASE_URL}</p>
          </div>
          <select
            aria-label="Document analysis model"
            value={modelId}
            onChange={(e) => setModelId(e.target.value)}
            disabled={loading}
            className="w-full sm:w-auto sm:max-w-xs min-w-0 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400"
          >
            <option value="prebuilt-layout">prebuilt-layout (Tables + Markdown)</option>
            <option value="prebuilt-invoice">prebuilt-invoice (Invoices)</option>
            <option value="prebuilt-receipt">prebuilt-receipt (Receipts)</option>
            <option value="prebuilt-read">prebuilt-read (Pure OCR Text)</option>
          </select>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: File Upload */}
          <div className="min-w-0 bg-slate-900 border border-slate-800 rounded-lg p-4 sm:p-6 space-y-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex flex-col items-center justify-center border-2 border-dashed border-slate-700 hover:border-sky-500 hover:bg-slate-800/50 rounded-lg p-6 sm:p-8 cursor-pointer transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400"
            >
              <Upload className="w-8 h-8 text-sky-400 mb-2" aria-hidden="true" />
              <span className="text-sm font-medium text-slate-200">{file ? 'Replace document' : 'Select document'}</span>
              <span className="text-xs text-slate-400 mt-1">PDF, PNG, JPEG, TIFF · Up to 50 MB</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.tif,.tiff"
              aria-label="Upload document"
              onChange={handleFileChange}
              className="hidden"
            />

            {file && (
              <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                <FileText className="w-5 h-5 shrink-0 text-sky-400" aria-hidden="true" />
                <div className="min-w-0 flex-1" aria-live="polite">
                  <p className="text-sm font-medium break-all">{file.name}</p>
                  <p className="text-xs text-slate-400 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  title="Remove uploaded file"
                  aria-label="Remove uploaded file"
                  className="shrink-0 w-11 h-11 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-300 hover:bg-rose-950/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400"
                >
                  <Trash2 className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>
            )}

            {previewUrl && (
              <div className="overflow-hidden rounded-lg border border-slate-700 bg-slate-950">
                <div className="flex items-center justify-between gap-3 px-3 py-2 border-b border-slate-800">
                  <h2 className="text-sm font-medium">Document preview</h2>
                  <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 py-2">
                    {isPdf ? 'Open PDF' : 'Open image'}<ExternalLink className="w-4 h-4" aria-hidden="true" />
                  </a>
                </div>
                {isPdf ? (
                  <object data={previewUrl} type="application/pdf" aria-label={`PDF preview: ${file.name}`} className="block w-full h-[420px] sm:h-[560px]">
                    <p className="p-4 text-sm text-slate-300">PDF preview is unavailable in this browser. <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="text-sky-400 underline">Open PDF</a></p>
                  </object>
                ) : (
                  <div className="max-h-[560px] overflow-auto p-2">
                    <img src={previewUrl} alt={`Preview of ${file.name}`} className="max-w-full max-h-[520px] object-contain mx-auto rounded" />
                  </div>
                )}
              </div>
            )}

            <button
              onClick={handleAnalyze}
              disabled={!file || loading}
              className="w-full min-h-[48px] py-3 px-4 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 disabled:text-slate-500 font-semibold flex items-center justify-center gap-2 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400"
              aria-busy={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing document...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Analyze Document
                </>
              )}
            </button>

            {error && (
              <div role="alert" className="p-3 bg-rose-950/60 border border-rose-800 rounded-lg text-rose-200 text-xs flex items-center gap-2 break-words">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                {error}
              </div>
            )}
          </div>

          {/* Right Column: OCR Output */}
          <div className="min-w-0 bg-slate-900 border border-slate-800 rounded-lg p-4 sm:p-6 flex flex-col min-h-[320px] sm:min-h-[420px]" aria-busy={loading}>
            {!result ? (
              <div className="m-auto text-center text-slate-500 space-y-2">
                <FileText className="w-10 h-10 mx-auto stroke-1" />
                <p className="text-sm">{loading ? 'Processing document...' : 'No analysis yet'}</p>
              </div>
            ) : (
              <div className="min-w-0 space-y-4 flex-1 flex flex-col">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div role="status" className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
                    <CheckCircle2 className="w-4 h-4" />
                    Processed in {result.processingTime} ({result.pages} page)
                  </div>
                  <div role="group" aria-label="Output format" className="flex flex-wrap gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
                    {['markdown', 'fields', 'tables', 'json'].map((t) => (
                      <button
                        key={t}
                        aria-pressed={activeTab === t}
                        onClick={() => setActiveTab(t)}
                        className={`min-h-[40px] px-2.5 py-1 rounded capitalize focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 ${
                          activeTab === t ? 'bg-sky-600 text-white' : 'text-slate-400'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="min-w-0 max-h-[640px] flex-1 overflow-auto bg-slate-950 rounded-lg p-3 sm:p-4 border border-slate-800 font-mono text-xs">
                  {activeTab === 'markdown' && (
                    <pre className="whitespace-pre-wrap text-slate-200">{result.markdown || 'No text content returned.'}</pre>
                  )}

                  {activeTab === 'fields' && (
                    <div className="space-y-2">
                      {result.fields?.length ? (
                        result.fields.map((f, i) => (
                          <div key={i} className="flex flex-col sm:flex-row justify-between gap-2 break-words border-b border-slate-800 pb-1.5">
                            <span className="text-slate-400">{f.key}:</span>
                            <span className="text-emerald-300">{f.value} ({Math.round(f.confidence * 100)}%)</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-slate-500">No key-value fields found. Try using prebuilt-invoice or prebuilt-receipt.</p>
                      )}
                    </div>
                  )}

                  {activeTab === 'tables' && (
                    <div className="space-y-4">
                      {result.tables?.length ? (
                        result.tables.map((tbl, idx) => (
                          <div key={idx} className="space-y-1">
                            <p className="text-sky-400 font-semibold">{tbl.name}</p>
                            <table className="w-full border-collapse border border-slate-800 text-left">
                              <thead>
                                <tr className="bg-slate-900">
                                  {tbl.headers.map((h, i) => (
                                    <th key={i} className="border border-slate-800 p-1.5">{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {tbl.rows.map((row, rIdx) => (
                                  <tr key={rIdx}>
                                    {row.map((cell, cIdx) => (
                                      <td key={cIdx} className="border border-slate-800 p-1.5">{cell}</td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ))
                      ) : (
                        <p className="text-slate-500">No tables detected in document.</p>
                      )}
                    </div>
                  )}

                  {activeTab === 'json' && (
                    <pre className="text-emerald-300">{JSON.stringify(result, null, 2)}</pre>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}