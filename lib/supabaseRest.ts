type SubmissionPayload = {
  email: string;
  name?: string;
  targetRole?: string;
  jobDescription?: string;
  extraContext?: string;
  resumeFileName?: string;
  resumePath?: string;
  preview?: unknown;
  paymentStatus?: string;
  stripeSessionId?: string;
  stripePaymentIntent?: string;
  paidAt?: string;
  checkoutUrl?: string;
};

type SubmissionUpdatePayload = Partial<SubmissionPayload>;

function hasSupabase() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function toSubmissionRow(payload: SubmissionUpdatePayload) {
  const row: Record<string, unknown> = {};

  if (payload.email !== undefined) row.email = payload.email;
  if (payload.name !== undefined) row.name = payload.name || null;
  if (payload.targetRole !== undefined) row.target_role = payload.targetRole || null;
  if (payload.jobDescription !== undefined) row.job_description = payload.jobDescription || null;
  if (payload.extraContext !== undefined) row.extra_context = payload.extraContext || null;
  if (payload.resumeFileName !== undefined) row.resume_file_name = payload.resumeFileName || null;
  if (payload.resumePath !== undefined) row.resume_path = payload.resumePath || null;
  if (payload.preview !== undefined) row.preview = payload.preview || null;
  if (payload.paymentStatus !== undefined) row.payment_status = payload.paymentStatus || 'previewed';
  if (payload.stripeSessionId !== undefined) row.stripe_session_id = payload.stripeSessionId || null;
  if (payload.stripePaymentIntent !== undefined) row.stripe_payment_intent = payload.stripePaymentIntent || null;
  if (payload.paidAt !== undefined) row.paid_at = payload.paidAt || null;
  if (payload.checkoutUrl !== undefined) row.checkout_url = payload.checkoutUrl || null;

  return row;
}

export async function uploadResumeToSupabase(file: File) {
  if (!hasSupabase()) {
    return { path: `local-preview/${Date.now()}-${file.name}`, skipped: true };
  }

  const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'resumes';
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${Date.now()}-${safeName}`;
  const url = `${process.env.SUPABASE_URL}/storage/v1/object/${bucket}/${path}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY as string,
      'Content-Type': file.type || 'application/octet-stream',
      'x-upsert': 'true'
    },
    body: Buffer.from(await file.arrayBuffer())
  });

  if (!res.ok) {
    const message = await res.text();
    throw new Error(`Supabase upload failed: ${message}`);
  }

  return { path, skipped: false };
}

export async function createSubmission(payload: SubmissionPayload) {
  if (!hasSupabase()) {
    return { id: `local-${Date.now()}`, skipped: true };
  }

  const url = `${process.env.SUPABASE_URL}/rest/v1/submissions`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY as string,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: JSON.stringify({
      ...toSubmissionRow(payload),
      email: payload.email,
      payment_status: payload.paymentStatus || 'previewed'
    })
  });

  if (!res.ok) {
    const message = await res.text();
    throw new Error(`Supabase insert failed: ${message}`);
  }

  const data = await res.json();
  return data[0];
}

export async function updateSubmission(id: string, payload: SubmissionUpdatePayload) {
  if (!hasSupabase()) {
    return { id, skipped: true };
  }

  const row = toSubmissionRow(payload);
  if (!Object.keys(row).length) {
    return { id };
  }

  const url = `${process.env.SUPABASE_URL}/rest/v1/submissions?id=eq.${encodeURIComponent(id)}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY as string,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: JSON.stringify(row)
  });

  if (!res.ok) {
    const message = await res.text();
    throw new Error(`Supabase update failed: ${message}`);
  }

  const data = await res.json();
  return data[0] || { id };
}

export async function updateSubmissionByStripeSessionId(
  stripeSessionId: string,
  payload: SubmissionUpdatePayload
) {
  if (!hasSupabase()) {
    return { stripeSessionId, skipped: true };
  }

  const row = toSubmissionRow(payload);
  if (!Object.keys(row).length) {
    return { stripeSessionId };
  }

  const url = `${process.env.SUPABASE_URL}/rest/v1/submissions?stripe_session_id=eq.${encodeURIComponent(stripeSessionId)}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY as string,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: JSON.stringify(row)
  });

  if (!res.ok) {
    const message = await res.text();
    throw new Error(`Supabase update failed: ${message}`);
  }

  const data = await res.json();
  return data[0] || { stripeSessionId };
}

export async function listSubmissions() {
  if (!hasSupabase()) {
    return [];
  }

  const url = `${process.env.SUPABASE_URL}/rest/v1/submissions?select=*&order=created_at.desc&limit=50`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY as string
    },
    cache: 'no-store'
  });

  if (!res.ok) {
    const message = await res.text();
    throw new Error(`Supabase query failed: ${message}`);
  }

  return res.json();
}
