import LodestarMark from '@/components/LodestarMark';
import OrderForm from '@/components/OrderForm';

export default function Page() {
  return (
    <main>
      <section className="hero-shell">
        <nav className="topbar">
          <a className="brand-link" href="#top" aria-label="Lodestar CV home">
            <LodestarMark compact />
            <span>Lodestar CV</span>
          </a>
          <a className="nav-cta" href="#order">Start</a>
        </nav>

        <div className="hero-grid" id="top">
          <div className="hero-copy">
            <div className="microcopy">Positioned for what is next</div>
            <h1>Tailor your resume to the job before you apply.</h1>
            <p>
              Upload the resume you have, paste the role you want, and get a focused rewrite angle in seconds.
            </p>
            <div className="hero-actions">
              <a className="primary-link" href="#order">Upload resume</a>
              <a className="secondary-link" href="#preview">See flow</a>
            </div>
          </div>

          <div className="hero-card" aria-label="Lodestar CV preview demo">
            <div className="score-row">
              <span>Current fit</span>
              <strong>42%</strong>
            </div>
            <div className="score-row gold">
              <span>After rewrite</span>
              <strong>87%</strong>
            </div>
            <div className="mini-doc">
              <span className="doc-line wide" />
              <span className="doc-line" />
              <span className="doc-line short" />
            </div>
            <div className="tag-stack">
              <span>CRM</span>
              <span>Outbound</span>
              <span>Follow up</span>
            </div>
          </div>
        </div>
      </section>

      <section className="trust-strip" aria-label="Product focus">
        <div>
          <strong>One resume</strong>
          <span>Start from what you already have</span>
        </div>
        <div>
          <strong>One target role</strong>
          <span>Use a job post or role title</span>
        </div>
        <div>
          <strong>One sharper application</strong>
          <span>Unlock the full rewrite after preview</span>
        </div>
      </section>

      <section className="order-section">
        <div className="section-heading">
          <span>Resume scan</span>
          <h2>Start with the job you actually want.</h2>
          <p>No mascot. No fake career guru voice. Just a cleaner resume angle for the role in front of you.</p>
        </div>
        <OrderForm />
      </section>

      <section className="flow-section" id="preview">
        <div className="section-heading compact-heading">
          <span>How it works</span>
          <h2>Built for mobile applicants.</h2>
        </div>
        <div className="flow-grid">
          <article>
            <span>01</span>
            <h3>Upload your current resume</h3>
            <p>Use the version you already have. The product starts with reality, not a blank page.</p>
          </article>
          <article>
            <span>02</span>
            <h3>Paste the job description</h3>
            <p>The scan finds the missing signals, keywords, risks, and strongest positioning angle.</p>
          </article>
          <article>
            <span>03</span>
            <h3>Unlock the rewrite</h3>
            <p>Get role specific bullets, summary, keyword alignment, cover note, and next application moves.</p>
          </article>
        </div>
      </section>

      <section className="final-cta">
        <LodestarMark />
        <h2>Ready to stop sending the same resume everywhere?</h2>
        <a className="primary-link" href="#order">Start my rewrite</a>
      </section>
    </main>
  );
}
