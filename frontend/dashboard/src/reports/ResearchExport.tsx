import { useId, useState } from 'react';
import type { DashboardData } from '../types';

export default function ResearchExport({ data, label = 'Download research summary' }: { data: DashboardData; label?: string }) {
  const generatedId = useId();
  const statusId = label === 'Download research summary' ? 'export-status' : generatedId;
  const [status, setStatus] = useState<'idle' | 'working' | 'done' | 'error'>('idle');
  async function download() {
    // Freeze the clicked snapshot before loading the PDF code or receiving another poll.
    const clicked = structuredClone(data);
    const snapshot = clicked.journal?.predictionId ? { ...clicked.journal.snapshot, prediction: clicked.journal.prediction, journal: clicked.journal } : clicked;
    const capturedAt = new Date().toISOString();
    setStatus('working');
    try {
      const { createResearchSummary } = await import('./researchSummary');
      const { blob, filename } = createResearchSummary(snapshot, capturedAt);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatus('done');
    } catch {
      setStatus('error');
    }
  }
  return <div className="research-export">
    <button className="button button-secondary" onClick={() => void download()} disabled={status === 'working'} aria-describedby={statusId}>{status === 'working' ? 'Preparing PDF…' : status === 'error' ? 'Retry PDF download' : label}</button>
    <p id={statusId} role="status">{status === 'error' ? 'PDF could not be created. Your data is unchanged; retry.' : status === 'done' ? 'PDF download started. Check your browser downloads.' : status === 'working' ? 'Capturing this patient snapshot locally.' : 'PDF · current snapshot · generated in your browser'}</p>
  </div>;
}
