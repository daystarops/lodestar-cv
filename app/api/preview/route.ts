import { NextResponse } from 'next/server';
import { createSubmission, uploadResumeToSupabase } from '@/lib/supabaseRest';

function keywordScan(text: string) {
  const library = [
    'CRM',
    'Salesforce',
    'Outbound',
    'Lead Qualification',
    'Pipeline',
    'Customer Support',
    'Operations',
    'Scheduling',
    'Data Entry',
    'Follow Up',
    'Quota',
    'Communication'
  ];

  const lower = text.toLowerCase();
  return library.filter((word) => lower.includes(word.toLowerCase())).slice(0, 6);
}

async function openAiPreview(targetRole: string, jobDescription: string, extraContext: string) {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0.25,
      messages: [
        {
          role: 'system',
          content:
            'You create concise resume tailoring previews. Return JSON only with currentMatch number, afterRewrite number, keywords array, angle string, risk string.'
        },
        {
          role: 'user',
          content: `Target role: ${targetRole}\nJob description: ${jobDescription}\nExtra context: ${extraContext}`
        }
      ],
      response_format: { type: 'json_object' }
    })
  });

  if (!res.ok) return null;
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) return null;

  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get('resume');
    const email = String(form.get('email') || '');
    const name = String(form.get('name') || '');
    const targetRole = String(form.get('targetRole') || 'Target role');
    const jobDescription = String(form.get('jobDescription') || '');
    const extraContext = String(form.get('extraContext') || '');

    let resumePath = '';
    let resumeFileName = '';

    if (file instanceof File && file.size > 0) {
      resumeFileName = file.name;
      const uploaded = await uploadResumeToSupabase(file);
      resumePath = uploaded.path;
    }

    const ai = await openAiPreview(targetRole, jobDescription, extraContext);
    const foundKeywords = keywordScan(`${targetRole} ${jobDescription} ${extraContext}`);

    const preview = ai || {
      currentMatch: 42,
      afterRewrite: 87,
      keywords: foundKeywords.length ? foundKeywords : ['CRM', 'Outbound', 'Follow Up', 'Pipeline'],
      angle: `Reframe existing experience toward ${targetRole} with clearer proof, cleaner keywords, and stronger role fit.`,
      risk: 'The current resume may undersell transferable experience and miss keywords from the job post.'
    };

    let submission = null;
    if (email) {
      submission = await createSubmission({
        email,
        name,
        targetRole,
        jobDescription,
        extraContext,
        resumeFileName,
        resumePath,
        preview,
        paymentStatus: 'previewed'
      });
    }

    return NextResponse.json({ preview, submissionId: submission?.id || null, resumePath });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Preview failed' },
      { status: 500 }
    );
  }
}
