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
};

function hasSupabase() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
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
      email: payload.email,
      name: payload.name || null,
      target_role: payload.targetRole || null,
      job_description: payload.jobDescription || null,
      extra_context: payload.extraContext || null,
      resume_file_name: payload.resumeFileName || null,
      resume_path: payload.resumePath || null,
      preview: payload.preview || null,
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
