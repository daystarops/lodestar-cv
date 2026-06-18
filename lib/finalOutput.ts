export type FinalOutput = {
  resume_title: string;
  rewritten_summary: string;
  core_skills: string[];
  rewritten_experience: Array<{
    company: string;
    role_title: string;
    bullets: string[];
  }>;
  technology: string[];
  keyword_alignment: string[];
  fit_risks: string[];
  suggested_next_step: string;
};

type RoleBucket =
  | 'software_engineer'
  | 'data_analyst'
  | 'registered_nurse'
  | 'project_manager'
  | 'product_manager'
  | 'sales_sdr_ae'
  | 'administrative_assistant'
  | 'customer_service'
  | 'entry_level'
  | 'teacher'
  | 'cybersecurity_analyst'
  | 'ai_engineer_consultant';

type SubmissionForFinalOutput = {
  name?: string | null;
  target_role?: string | null;
  job_description?: string | null;
  extra_context?: string | null;
  resume_text?: string | null;
  resume_file_name?: string | null;
  preview?: unknown;
};

const roleBuckets: RoleBucket[] = [
  'software_engineer',
  'data_analyst',
  'registered_nurse',
  'project_manager',
  'product_manager',
  'sales_sdr_ae',
  'administrative_assistant',
  'customer_service',
  'entry_level',
  'teacher',
  'cybersecurity_analyst',
  'ai_engineer_consultant'
];

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

function parseRewrittenExperience(value: unknown): FinalOutput['rewritten_experience'] {
  if (!Array.isArray(value)) return [];

  return value.map((item) => {
    const record = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};

    return {
      company: String(record.company || ''),
      role_title: String(record.role_title || record.title || ''),
      bullets: asStringArray(record.bullets)
    };
  });
}

function parseFinalOutput(content: string): FinalOutput | null {
  try {
    const parsed = JSON.parse(content) as Record<string, unknown>;
    return {
      resume_title: String(parsed.resume_title || ''),
      rewritten_summary: String(parsed.rewritten_summary || ''),
      core_skills: asStringArray(parsed.core_skills),
      rewritten_experience: parseRewrittenExperience(parsed.rewritten_experience),
      technology: asStringArray(parsed.technology),
      keyword_alignment: asStringArray(parsed.keyword_alignment),
      fit_risks: asStringArray(parsed.fit_risks),
      suggested_next_step: String(parsed.suggested_next_step || '')
    };
  } catch {
    return null;
  }
}

function detectRoleBucket(targetRole: string, jobDescription: string): RoleBucket {
  const text = `${targetRole} ${jobDescription}`.toLowerCase();

  if (/\b(sdr|sales development|account executive|ae\b|sales representative|business development|bdr|outside sales|inside sales)\b/.test(text)) {
    return 'sales_sdr_ae';
  }
  if (/\b(ai engineer|machine learning engineer|machine learning|ml engineer|llm|prompt engineer|ai consultant|artificial intelligence consultant)\b/.test(text)) {
    return 'ai_engineer_consultant';
  }
  if (/\b(cybersecurity|cyber security|cybersecurity analyst|security analyst|soc analyst|information security)\b/.test(text)) {
    return 'cybersecurity_analyst';
  }
  if (/\b(software engineer|developer|frontend|backend|full stack|full-stack)\b/.test(text)) {
    return 'software_engineer';
  }
  if (/\b(data analyst|business analyst|analytics|sql|tableau|power bi)\b/.test(text)) {
    return 'data_analyst';
  }
  if (/\b(registered nurse|\brn\b|nursing|patient care)\b/.test(text)) {
    return 'registered_nurse';
  }
  if (/\b(product manager|product owner|roadmap|user stories)\b/.test(text)) {
    return 'product_manager';
  }
  if (/\b(project manager|program manager|scrum master|pmp)\b/.test(text)) {
    return 'project_manager';
  }
  if (/\b(administrative assistant|office assistant|executive assistant|receptionist)\b/.test(text)) {
    return 'administrative_assistant';
  }
  if (/\b(customer service|customer support|call center|client support)\b/.test(text)) {
    return 'customer_service';
  }
  if (/\b(teacher|educator|instructional|classroom|curriculum)\b/.test(text)) {
    return 'teacher';
  }
  if (/\b(entry level|junior|associate|internship|intern)\b/.test(text)) {
    return 'entry_level';
  }

  return 'entry_level';
}

function getRolePack(bucket: RoleBucket) {
  if (bucket === 'sales_sdr_ae') {
    return [
      'Role pack: sales_sdr_ae.',
      'Prioritize resume evidence related to customer acquisition, outbound follow-up, CRM pipeline management, lead qualification, appointment setting, objection handling, customer discovery, product education, quota or volume achievement, revenue activity, and direct sales transferability.',
      'Avoid these phrases unless directly supported by resume evidence: dynamic and motivated, eager to leverage, proven ability, successfully increasing brand awareness.',
      'Do not pretend the candidate did door-to-door sales, lobby events, telecom sales, MDU sales, territory canvassing, or other specific sales motions unless those facts appear in the resume evidence.',
      'Translate adjacent evidence carefully: customer service may support customer discovery, product education, objection handling, and follow-up only when the resume shows customer interaction. Operations or admin work may support CRM hygiene, pipeline tracking, scheduling, and volume handling only when the resume shows comparable tracking or coordination.'
    ].join('\n');
  }

  return [
    `Role pack: ${bucket}.`,
    'Use the role bucket only to prioritize relevant resume evidence and job keywords.',
    'Do not add role-specific duties, tools, credentials, industries, metrics, or accomplishments unless they are present in the resume evidence or extra context.'
  ].join('\n');
}

function demoFinalOutput(submission: SubmissionForFinalOutput): FinalOutput {
  const targetRole = submission.target_role || 'the target role';
  const jobDescription = submission.job_description || 'the provided job description';
  const sourceLabel = submission.resume_file_name || submission.name || 'Uploaded resume';

  return {
    resume_title: `${targetRole} Resume Rewrite`,
    rewritten_summary: `Candidate positioned for ${targetRole} with a practical mix of customer communication, follow-through, prioritization, and operational reliability. The resume should lead with transferable wins, clear ownership, and keywords drawn directly from the role.`,
    core_skills: [
      'Customer communication',
      'Follow-up',
      'Prioritization',
      'Operational reliability',
      'Process ownership'
    ],
    rewritten_experience: [
      {
        company: sourceLabel,
        role_title: targetRole,
        bullets: [
          'Reframed customer-facing and operational work into clearer, role-relevant resume achievements.',
          'Strengthened follow-up, prioritization, communication, and process ownership language for applicant tracking systems.',
          'Connected transferable experience to the target role with clearer proof points and business impact.'
        ]
      }
    ],
    technology: [],
    keyword_alignment: [
      targetRole,
      'Customer communication',
      'Follow up',
      'Prioritization',
      'Operations',
      'Process improvement'
    ],
    fit_risks: [
      'Some experience may need stronger metrics before the final resume is submitted.',
      `The resume should mirror exact language from this job post: ${jobDescription.slice(0, 140)}`
    ],
    suggested_next_step:
      'For stronger future applications, Lodestar CV can add a deeper human review pass once more resume detail and measurable outcomes are available.'
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
  const jobDescription = submission.job_description || '';
  const roleBucket = detectRoleBucket(targetRole, jobDescription);
  const rolePack = getRolePack(roleBucket);

  // Production-quality rewrites require real PDF/DOCX parsing. Until that is implemented,
  // fall back to stored resume_text when present plus resume_file_name, job_description,
  // target_role, extra_context, and preview metadata.
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
            content: [
              'You create paid resume rewrite fulfillment outputs for Lodestar CV.',
              'The output must be a completed resume rewrite ready to send to employers. It must not be advice, a cover letter, outreach copy, a role explanation, or a list of suggested bullets.',
              'Return JSON only with exactly these keys: resume_title string, rewritten_summary string, core_skills array of strings, rewritten_experience array, technology array of strings, keyword_alignment array of strings, fit_risks array of strings, suggested_next_step string.',
              'rewritten_experience must be a complete resume experience section. Each item must have company string, role_title string, and bullets array of rewritten resume bullets.',
              'Evidence-first workflow: extract resume evidence first; extract job requirements second; map evidence to requirements third; rewrite only what the resume supports.',
              'Do not invent experience, employers, credentials, tools, metrics, industries, sales motions, or job duties. You may translate and reposition existing resume evidence, but unsupported job-description duties must go into fit_risks instead of bullets.',
              'If resume text is unavailable or thin, use the file name, target role, job description, extra context, and preview only as limited context. Be explicit in fit_risks that the rewrite is constrained by missing parsed resume evidence.',
              `Available Lodestar researched role buckets: ${roleBuckets.join(', ')}.`,
              rolePack
            ].join('\n')
          },
          {
            role: 'user',
            content: [
              `Customer name: ${submission.name || ''}`,
              `Target role: ${targetRole}`,
              `Detected role bucket: ${roleBucket}`,
              `Resume context: ${resumeContext}`,
              `Job description: ${jobDescription}`,
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
