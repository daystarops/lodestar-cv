export type FinalOutput = {
  rewritten_summary: string;
  rewritten_experience_bullets: string[];
  keyword_alignment: string[];
  cover_note: string;
  outreach_message: string;
  fit_risks: string[];
  next_application_moves: string[];
};

type SubmissionForFinalOutput = {
  name?: string | null;
  target_role?: string | null;
  job_description?: string | null;
  extra_context?: string | null;
  resume_text?: string | null;
  resume_file_name?: string | null;
  preview?: unknown;
};

const fallbackBullets = [
  'Reframed customer-facing and operational work into measurable, role-relevant achievements.',
  'Strengthened follow-up, prioritization, communication, and process ownership language for applicant tracking systems.',
  'Connected transferable experience to the target role with clearer proof points and business impact.'
];

function parseFinalOutput(content: string): FinalOutput | null {
  try {
    const parsed = JSON.parse(content);
    return {
      rewritten_summary: String(parsed.rewritten_summary || ''),
      rewritten_experience_bullets: Array.isArray(parsed.rewritten_experience_bullets)
        ? parsed.rewritten_experience_bullets.map(String)
        : [],
      keyword_alignment: Array.isArray(parsed.keyword_alignment)
        ? parsed.keyword_alignment.map(String)
        : [],
      cover_note: String(parsed.cover_note || ''),
      outreach_message: String(parsed.outreach_message || ''),
      fit_risks: Array.isArray(parsed.fit_risks) ? parsed.fit_risks.map(String) : [],
      next_application_moves: Array.isArray(parsed.next_application_moves)
        ? parsed.next_application_moves.map(String)
        : []
    };
  } catch {
    return null;
  }
}

function demoFinalOutput(submission: SubmissionForFinalOutput): FinalOutput {
  const targetRole = submission.target_role || 'the target role';
  const jobDescription = submission.job_description || 'the provided job description';

  return {
    rewritten_summary: `Candidate positioned for ${targetRole} with a practical mix of customer communication, follow-through, prioritization, and operational reliability. The resume should lead with transferable wins, clear ownership, and keywords drawn directly from the role.`,
    rewritten_experience_bullets: fallbackBullets,
    keyword_alignment: [
      targetRole,
      'Customer communication',
      'Follow up',
      'Prioritization',
      'Operations',
      'Process improvement'
    ],
    cover_note: `I am excited to apply for ${targetRole}. My background has built the exact habits this role needs: dependable follow-through, clear communication, and the ability to keep work moving in busy environments. I would welcome the chance to bring that execution mindset to your team.`,
    outreach_message: `Hi, I just applied for your ${targetRole} opening and wanted to briefly introduce myself. My background maps well to the role's need for communication, follow-through, and reliable execution. I would appreciate the chance to discuss how I can contribute.`,
    fit_risks: [
      'Some experience may need stronger metrics before the final resume is submitted.',
      `The resume should mirror exact language from this job post: ${jobDescription.slice(0, 140)}`
    ],
    next_application_moves: [
      'Add two to three measurable outcomes to the strongest recent role.',
      'Mirror the top job-post keywords in the summary and first three bullets.',
      'Send the outreach message within 24 hours of applying.'
    ]
  };
}

export async function generatePaidFinalOutput(submission: SubmissionForFinalOutput) {
  if (!process.env.OPENAI_API_KEY) {
    return {
      output: demoFinalOutput(submission),
      status: 'generated_demo',
      error: null
    };
  }

  const targetRole = submission.target_role || 'Target role';
  const preview = JSON.stringify(submission.preview || {});

  // TODO: Upgrade fulfillment with real PDF/DOCX parsing. Today the app can only use stored
  // resume_text when present plus form fields and uploaded file metadata.
  const resumeContext = submission.resume_text
    ? submission.resume_text
    : `No parsed resume text is available. Uploaded file name: ${submission.resume_file_name || 'none'}.`;

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature: 0.35,
        messages: [
          {
            role: 'system',
            content:
              'You create paid resume rewrite fulfillment outputs. Return JSON only with rewritten_summary string, rewritten_experience_bullets array, keyword_alignment array, cover_note string, outreach_message string, fit_risks array, next_application_moves array.'
          },
          {
            role: 'user',
            content: [
              `Customer name: ${submission.name || ''}`,
              `Target role: ${targetRole}`,
              `Resume context: ${resumeContext}`,
              `Job description: ${submission.job_description || ''}`,
              `Extra context: ${submission.extra_context || ''}`,
              `Preview scan: ${preview}`
            ].join('\n\n')
          }
        ],
        response_format: { type: 'json_object' }
      })
    });

    if (!res.ok) {
      return {
        output: demoFinalOutput(submission),
        status: 'generated_demo',
        error: await res.text()
      };
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    const output = content ? parseFinalOutput(content) : null;

    if (!output) {
      return {
        output: demoFinalOutput(submission),
        status: 'generated_demo',
        error: 'OpenAI returned an invalid final output payload.'
      };
    }

    return { output, status: 'generated', error: null };
  } catch (error) {
    return {
      output: demoFinalOutput(submission),
      status: 'generated_demo',
      error: error instanceof Error ? error.message : 'OpenAI final output failed.'
    };
  }
}
