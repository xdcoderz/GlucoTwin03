import { Component, type ReactNode } from 'react';

export default class SectionLoadBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return <section className="error-panel" role="alert">
      <h2>This section could not load</h2>
      <p>Reload the page to try again.</p>
      <button className="button button-secondary" onClick={() => window.location.reload()}>Reload page</button>
    </section>;
  }
}
