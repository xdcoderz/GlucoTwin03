import { useEffect, useRef, useState } from 'react';
import './experience.css';
import './landingLayout.css';

/** The imported experience is display-only; all patient writes stay in the workspace. */
export default function LandingExperience() {
  const host = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const [mounting, setMounting] = useState(true);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | undefined;
    setFailed(false);
    setMounting(true);
    import('./experience').then(({ mountLanding }) => {
      if (cancelled || !host.current) return;
      const experience = mountLanding(host.current, () => setAttempt(value => value + 1));
      cleanup = experience.dispose;
      setMounting(false);
    }).catch(() => { if (!cancelled) { setFailed(true); setMounting(false); } });
    return () => { cancelled = true; cleanup?.(); };
  }, [attempt]);
  return <div className="landing-experience">
    <section className="landing-introduction" aria-labelledby="landing-title" data-testid="landing-introduction">
      <div><p className="landing-kicker">GLUCOTWIN / THE VIRTUAL PATIENT</p><h1 id="landing-title" tabIndex={-1}>A little closer<br/> to <em>you.</em></h1></div>
      <div className="landing-intro-copy"><p>A patient. A meal. The next 120 minutes. Explore the organs behind the glucose story, then open the workspace to inspect a saved model score.</p><div className="landing-workspace-links"><a className="landing-workspace-cta" href="#workspace">Open patient workspace<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M7 17 17 7M7 7h10v10"/></svg></a><a href="#evidence">Model evidence &amp; limitations</a></div></div>
    </section>
    <div ref={host} data-testid="landing-experience" />
    {failed && <div className="landing-fallback"><h2>The anatomy experience could not start</h2><p>The patient workspace and model evidence are still available.</p><button className="button button-secondary" onClick={() => setAttempt(value => value + 1)}>Retry anatomy</button><a className="button button-primary" href="#workspace">Open patient workspace</a></div>}
    {mounting && <p className="landing-loading" role="status">Preparing the anatomy experience…</p>}
  </div>;
}
