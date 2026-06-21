'use client';

import { useMemo, useRef, useState } from 'react';

type Preview = {
  currentMatch: number;
  afterRewrite: number;
  keywords: string[];
  angle: string;
  risk: string;
};

const rolePills = ['Sales', 'Customer Support', 'Operations', 'Admin', 'Hospitality', 'Healthcare'];

export default function OrderForm() {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [targetRole, setTargetRole] = useState('Sales Development Representative');
  const [jobDescription, setJobDescription] = useState('');
  const [extraContext, setExtraContext] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [submissionId, setSubmissionId] = useState('');
  const [resumePath, setResumePath] = useState('');
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [message, setMessage] = useState('');

  const canPreview = useMemo(() => email.trim() && targetRole.trim(), [email, targetRole]);

  async function handlePreview() {
    setMessage('');

    if (!canPreview) {
      setMessage('Add an email and target role first.');
      return;
    }

    setLoadingPreview(true);
    try {
      const data = new FormData();
      if (file) data.append('resume', file);
      data.append('name', name);
      data.append('email', email);
      data.append('targetRole', targetRole);
      data.append('jobDescription', jobDescription);
      data.append('extraContext', extraContext);
      data.append('submissionId', submissionId);

      const res = await fetch('/api/preview', {
        method: 'POST',
        body: data
      });

      const responseText = await res.text();
      let json: {
        error?: string;
        preview?: Preview;
        submissionId?: string | null;
        resumePath?: string;
        parserStatus?: string;
        parserError?: string;
      } = {};

      try {
        json = responseText ? JSON.parse(responseText) : {};
      } catch {
        throw new Error('Preview failed. Please try again.');
      }

      if (!res.ok) throw new Error(json.error || 'Preview failed.');

      if (!json.preview) throw new Error('Preview failed.');

      setPreview(json.preview);
      setSubmissionId(json.submissionId || submissionId);
      setResumePath(json.resumePath || '');

      if (json.parserStatus && json.parserStatus !== 'parsed' && json.parserError) {
        setMessage(json.parserError);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Preview failed.');
    } finally {
      setLoadingPreview(false);
    }
  }

  async function handleCheckout() {
    setMessage('');

    if (!email.trim()) {
      setMessage('Add your email first.');
      return;
    }

    setLoadingCheckout(true);
    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          targetRole,
          jobDescription,
          extraContext,
          resumeFileName: file?.name || '',
          resumePath,
          preview,
          submissionId
        })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Checkout failed.');

      window.location.href = json.url;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Checkout failed.');
    } finally {
      setLoadingCheckout(false);
    }
  }

  return (
    <div className="order-flow" id="order">
      <div className="upload-panel">
        <button className="file-drop" type="button" onClick={() => fileRef.current?.click()}>
          <span className="file-icon">↑</span>
          <strong>{file ? file.name : 'Upload your current resume'}</strong>
          <small>PDF, DOCX, DOC, or TXT</small>
        </button>
        <input
          ref={fileRef}
          className="hidden-file"
          type="file"
          accept=".pdf,.doc,.docx,.txt"
          onChange={(event) => setFile(event.target.files?.[0] || null)}
        />
      </div>

      <div className="field-grid two">
        <label>
          <span>Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jordan Wright" />
        </label>
        <label>
          <span>Email</span>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
        </label>
      </div>

      <label className="field-block">
        <span>Target role</span>
        <input value={targetRole} onChange={(e) => setTargetRole(e.target.value)} />
      </label>

      <div className="role-pills" aria-label="Common target roles">
        {rolePills.map((role) => (
          <button key={role} type="button" onClick={() => setTargetRole(role)}>
            {role}
          </button>
        ))}
      </div>

      <label className="field-block">
        <span>Paste job description</span>
        <textarea
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          placeholder="Paste the job post. The fuller the post, the sharper the rewrite."
          rows={6}
        />
      </label>

      <label className="field-block">
        <span>Extra context</span>
        <textarea
          value={extraContext}
          onChange={(e) => setExtraContext(e.target.value)}
          placeholder="Example: I am moving from physical work into desk work. Highlight follow up, CRM, volume, customer handling, and operational grit."
          rows={4}
        />
      </label>

      <button className="primary-action" type="button" onClick={handlePreview} disabled={loadingPreview}>
        {loadingPreview ? 'Scanning...' : 'Preview my resume angle'}
      </button>

      {message && <p className="form-message">{message}</p>}

      {preview && (
        <section className="preview-result" aria-live="polite">
          <div className="preview-header">
            <span>Preview scan</span>
            <strong>{preview.currentMatch}% → {preview.afterRewrite}%</strong>
          </div>

          <div className="meter">
            <div style={{ width: `${Math.min(preview.afterRewrite, 100)}%` }} />
          </div>

          <div className="preview-copy">
            <h3>Your stronger angle</h3>
            <p>{preview.angle}</p>
          </div>

          <div className="keyword-row">
            {preview.keywords.map((word) => (
              <span key={word}>{word}</span>
            ))}
          </div>

          <div className="risk-note">
            <strong>Fit risk</strong>
            <p>{preview.risk}</p>
          </div>

          <button className="checkout-action" type="button" onClick={handleCheckout} disabled={loadingCheckout}>
            {loadingCheckout ? 'Opening checkout...' : 'Unlock full rewrite'}
          </button>
        </section>
      )}
    </div>
  );
}
