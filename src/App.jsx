import React, { useEffect, useRef, useState } from 'react';
import { Upload, FileText, Play, Loader2, CheckCircle2, AlertCircle, Trash2, ExternalLink, ScanLine, FileSearch, Braces, Table2, ListFilter, FileCode2, Copy, Download, Check, PanelLeftClose, ChevronRight } from 'lucide-react';
import './App.css';

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
  const [dragging, setDragging] = useState(false);
  const [copied, setCopied] = useState(false);
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

  const selectFile = (selected) => {
    if (!selected) return;
    clearAnalysis();
    setCopied(false);
    if (selected.size > 50 * 1024 * 1024 || !/\.(pdf|png|jpe?g|tiff?)$/i.test(selected.name)) {
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setError('Choose a PDF, PNG, JPEG, or TIFF file up to 50 MB.');
      return;
    }
    setFile(selected);
  };

  const outputText = result ? (activeTab === 'markdown' ? result.markdown || '' : JSON.stringify(activeTab === 'json' ? result : result[activeTab] || [], null, 2)) : '';

  const copyOutput = async () => {
    try {
      await navigator.clipboard.writeText(outputText);
      setCopied(true);
    } catch {
      setError('Clipboard access is unavailable. Download the output instead.');
    }
  };

  const downloadOutput = () => {
    const url = URL.createObjectURL(new Blob([outputText], { type: activeTab === 'markdown' ? 'text/markdown' : 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${file.name.replace(/\.[^.]+$/, '')}-${activeTab}.${activeTab === 'markdown' ? 'md' : 'json'}`;
    link.click();
    URL.revokeObjectURL(url);
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
    <div className="app-shell">
      <header className="app-header">
        <div className="brand"><span className="brand-mark"><ScanLine size={23} /></span><div><strong>Document Studio</strong><span>AZURE AI DOCUMENT INTELLIGENCE</span></div></div>
        <div className="header-context"><span>Workspace</span><ChevronRight size={14} /><strong>Document extraction</strong></div>
        <span className="environment"><span />OCR workspace</span>
      </header>

      <main className="workspace">
        <aside className="setup-pane" aria-label="Document setup">
          <div className="pane-heading"><h1>Document extraction</h1><p>New analysis</p></div>
          <section className="setup-section">
            <h2><span className="step-number">1</span> Source document</h2>
            <button type="button" className={`upload-zone ${dragging ? 'is-dragging' : ''}`} onClick={() => fileInputRef.current?.click()}
              onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => { event.preventDefault(); setDragging(false); selectFile(event.dataTransfer.files?.[0]); }}>
              <span className="upload-icon"><Upload size={23} /></span>
              <strong>{file ? 'Replace document' : 'Upload a document'}</strong>
              <span className="upload-action">Browse files <span>or drag and drop</span></span>
              <small>PDF, PNG, JPEG, TIFF / Max. 50 MB</small>
            </button>
            <input ref={fileInputRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.tif,.tiff" aria-label="Upload document" onChange={(event) => selectFile(event.target.files?.[0])} hidden />
            {file && <div className="selected-file"><span className="file-icon"><FileText size={21} /></span><div aria-live="polite"><strong>{file.name}</strong><small>{(file.size / 1024).toFixed(1)} KB</small></div><button className="icon-button danger" onClick={handleRemoveFile} title="Remove document" aria-label="Remove document"><Trash2 size={17} /></button></div>}
          </section>
          <section className="setup-section">
            <h2><span className="step-number">2</span> Analysis model</h2>
            <label className="input-label" htmlFor="analysis-model">Document model</label>
            <select id="analysis-model" value={modelId} onChange={(event) => { setModelId(event.target.value); }} disabled={loading}>
              <option value="prebuilt-layout">Layout & tables</option><option value="prebuilt-invoice">Invoice</option><option value="prebuilt-receipt">Receipt</option><option value="prebuilt-read">Text recognition</option>
            </select>
            <div className="model-id"><ScanLine size={14} /><code>{modelId}</code></div>
          </section>
          <div className="analysis-action">
            <button className="primary-button" onClick={handleAnalyze} disabled={!file || loading} aria-busy={loading}>{loading ? <Loader2 className="spin" size={17} /> : <Play size={16} />}{loading ? 'Analyzing document...' : 'Analyze document'}</button>
            {error && <div role="alert" className="error-message"><AlertCircle size={17} /><span>{error}</span></div>}
          </div>
          <div className="endpoint"><span className="endpoint-label"><PanelLeftClose size={15} />API endpoint</span><code title={API_BASE_URL}>{API_BASE_URL}</code></div>
        </aside>

        <section className="document-pane" aria-labelledby="preview-heading">
          <div className="pane-toolbar"><h2 id="preview-heading"><FileText size={17} />Document preview</h2>{previewUrl && <a className="icon-button" href={previewUrl} target="_blank" rel="noopener noreferrer" title="Open original document" aria-label="Open original document"><ExternalLink size={17} /></a>}</div>
          <div className={`preview-surface ${previewUrl ? 'has-document' : ''}`}>
            {previewUrl ? (isPdf ? <object data={previewUrl} type="application/pdf" aria-label={`PDF preview: ${file.name}`}><p>Preview unavailable. <a href={previewUrl} target="_blank" rel="noopener noreferrer">Open PDF</a></p></object> : <img src={previewUrl} alt={`Preview of ${file.name}`} />) : <div className="empty-state"><div className="document-illustration" aria-hidden="true"><div className="paper-fold" /><ScanLine size={36} strokeWidth={1.2} /><span /><span /><span /><div className="paper-stamp"><FileSearch size={20} /></div></div><h3>No document selected</h3><p>Your source document will appear here.</p><button className="secondary-button" onClick={() => fileInputRef.current?.click()}><Upload size={16} />Select document</button></div>}
          </div>
          <div className="pane-footer"><span className="truncate">{file ? file.name : 'Source document'}</span><span>{file ? (isPdf ? 'PDF' : 'IMAGE') : 'No file'}</span></div>
        </section>

        <section className="results-pane" aria-labelledby="results-heading" aria-busy={loading}>
          <div className="pane-toolbar"><h2 id="results-heading"><FileSearch size={17} />Extraction results</h2><div className="toolbar-actions"><button className="icon-button" onClick={copyOutput} disabled={!result} title={copied ? 'Copied' : 'Copy output'} aria-label={copied ? 'Copied' : 'Copy output'}>{copied ? <Check size={17} /> : <Copy size={17} />}</button><button className="icon-button" onClick={downloadOutput} disabled={!result} title="Download output" aria-label="Download output"><Download size={17} /></button></div></div>
          <div className="output-tabs" role="group" aria-label="Output format">{[{ id: 'markdown', label: 'Text', icon: FileCode2 }, { id: 'fields', label: 'Fields', icon: ListFilter }, { id: 'tables', label: 'Tables', icon: Table2 }, { id: 'json', label: 'JSON', icon: Braces }].map(({ id, label, icon: Icon }) => <button key={id} aria-pressed={activeTab === id} className={activeTab === id ? 'active' : ''} onClick={() => { setActiveTab(id); setCopied(false); }}><Icon size={15} />{label}</button>)}</div>
          {!result ? <div className="empty-state results-empty" role="status"><span className={`result-symbol ${loading ? 'processing' : ''}`}>{loading ? <Loader2 size={29} className="spin" /> : <ScanLine size={29} strokeWidth={1.4} />}</span><h3>{loading ? 'Extracting your document' : 'Ready for extraction'}</h3><p>{loading ? 'Analysis in progress...' : 'No results yet'}</p><span className="status-label"><span className={loading ? 'status-dot busy' : 'status-dot'} />{loading ? 'Processing' : file ? 'Document ready' : 'Waiting for document'}</span></div> : <div className="output-content" aria-label={`${activeTab} output`}>
            {activeTab === 'markdown' && <pre className="text-output">{result.markdown || 'No text content returned.'}</pre>}
            {activeTab === 'fields' && (result.fields?.length ? <dl className="fields-list">{result.fields.map((field, index) => <div key={index}><dt>{field.key}</dt><dd>{typeof field.value === 'object' ? JSON.stringify(field.value) : field.value}{Number.isFinite(field.confidence) && <span className="confidence">{Math.round(field.confidence * 100)}%</span>}</dd></div>)}</dl> : <p className="no-content">No key-value fields found.</p>)}
            {activeTab === 'tables' && (result.tables?.length ? result.tables.map((table, index) => <div className="table-block" key={index}><h3>{table.name || `Table ${index + 1}`}</h3><div className="table-scroll"><table><thead><tr>{table.headers.map((header, headerIndex) => <th key={headerIndex}>{header}</th>)}</tr></thead><tbody>{table.rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody></table></div></div>) : <p className="no-content">No tables detected in document.</p>)}
            {activeTab === 'json' && <pre className="json-output">{JSON.stringify(result, null, 2)}</pre>}
          </div>}
          <div className="pane-footer" role="status">{result ? <><span className="success-status"><CheckCircle2 size={14} />Analysis complete</span><span>{result.pages} {result.pages === 1 ? 'page' : 'pages'} / {result.processingTime}</span></> : <><span>{loading ? 'Analysis in progress' : 'Awaiting analysis'}</span><span>{modelId.replace('prebuilt-', '')}</span></>}</div>
        </section>
      </main>
    </div>
  );
}