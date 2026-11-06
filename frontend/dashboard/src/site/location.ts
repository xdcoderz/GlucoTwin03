import { useEffect, useState } from 'react';
export type Destination = 'overview' | 'workspace' | 'evidence' | 'future';
function read() {
  const hash = window.location.hash.slice(1);
  const destination: Destination = ['future','validation-roadmap'].includes(hash) ? 'future' : hash === 'evidence' ? 'evidence' : ['workspace','patient-twin','phase-one-flow','prediction-section','workflow-section','review-section','patient-record','meal-context','score-step'].includes(hash) ? 'workspace' : 'overview';
  return { destination, anchor: hash, patient: new URLSearchParams(location.search).get('patient') === 'DEMO-002' ? 'DEMO-002' : 'DEMO-001' };
}
export function useSiteLocation() {
  const [value, setValue] = useState(read);
  useEffect(() => { const update = () => setValue(read()); window.addEventListener('hashchange',update); window.addEventListener('popstate',update); return () => { window.removeEventListener('hashchange',update); window.removeEventListener('popstate',update); }; },[]);
  return value;
}
