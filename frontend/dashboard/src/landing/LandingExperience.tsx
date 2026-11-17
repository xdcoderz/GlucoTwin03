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
      <div><p className="landing-kicker">GlucoTwin · A patient in context</p><h1 id="landing-title" tabIndex={-1}>See the person.<br/>Explore the response.</h1></div>
      <div className="landing-intro-copy"><p>Bring the patient, the meal and the glucose timeline into one view. Explore the anatomy, compare research simulations and inspect the evidence behind each result.</p><div className="landing-workspace-links"><a className="landing-workspace-cta" href="#workspace">Open patient workspace</a><a href="#evidence">Explore the evidence</a></div></div>
      <dl className="landing-capabilities"><div><dt>Prediction window</dt><dd>120 <span>minutes</span></dd></div><div><dt>Connected context</dt><dd>Patient <span>+ meal + glucose</span></dd></div><div><dt>Experience</dt><dd>Interactive <span>visual twin</span></dd></div></dl>
    </section>
    <div ref={host} data-testid="landing-experience" />
    {failed && <div className="landing-fallback"><h2>The anatomy experience could not start</h2><p>The patient workspace and model evidence are still available.</p><button className="button button-secondary" onClick={() => setAttempt(value => value + 1)}>Retry anatomy</button><a className="button button-primary" href="#workspace">Open patient workspace</a></div>}
    {mounting && <p className="landing-loading" role="status">Preparing the anatomy experience…</p>}
  </div>;
}
