export type FinalOutput = {
  resume: {
    candidate_name: string;
    contact_line: string;
    resume_headline: string;
    professional_summary: string;
    experience: Array<{
      company: string;
      role_title: string;
      date_range: string;
      bullets: string[];
    }>;
    additional_sections: Array<{
      section_title: string;
      items: string[];
    }>;
  };
  fit_risks: string[];
  suggested_next_step: string;
};

type SourceEvidence = {
  candidate_name: string;
  contact_line: string;
  resume_headline: string;
  professional_summary: string;
  experience: Array<{
    company: string;
    role_title: string;
    date_range: string;
    original_bullets: string[];
  }>;
  additional_sections: Array<{
    section_title: string;
    items: string[];
  }>;
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

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : value == null ? '' : String(value).trim();
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.map(normalizeText).filter(Boolean) : [];
}

function parseSourceExperience(value: unknown): SourceEvidence['experience'] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      const record = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};

      return {
        company: normalizeText(record.company),
        role_title: normalizeText(record.role_title || record.title),
        date_range: normalizeText(record.date_range || record.dates),
        original_bullets: asStringArray(record.original_bullets || record.bullets)
      };
    })
    .filter((item) => item.company || item.role_title || item.original_bullets.length);
}

function parseAdditionalSections(value: unknown): SourceEvidence['additional_sections'] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      const record = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};

      return {
        section_title: normalizeText(record.section_title || record.title),
        items: asStringArray(record.items)
      };
    })
    .filter((section) => section.section_title && section.items.length);
}

function parseSourceEvidence(content: string): SourceEvidence | null {
  try {
    const parsed = JSON.parse(content) as Record<string, unknown>;
    return {
      candidate_name: normalizeText(parsed.candidate_name),
      contact_line: normalizeText(parsed.contact_line || parsed.contact_information),
      resume_headline: normalizeText(parsed.resume_headline || parsed.headline),
      professional_summary: normalizeText(parsed.professional_summary || parsed.summary),
      experience: parseSourceExperience(parsed.experience),
      additional_sections: parseAdditionalSections(parsed.additional_sections)
    };
  } catch {
    return null;
  }
}

function parseFinalExperience(value: unknown): FinalOutput['resume']['experience'] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      const record = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};

      return {
        company: normalizeText(record.company),
        role_title: normalizeText(record.role_title || record.title),
        date_range: normalizeText(record.date_range || record.dates),
        bullets: asStringArray(record.bullets).slice(0, 5)
      };
    })
    .filter((item) => item.company || item.role_title || item.bullets.length)
    .slice(0, 3);
}

function parseFinalOutput(content: string): FinalOutput | null {
  try {
    const parsed = JSON.parse(content) as Record<string, unknown>;
    const resume = parsed.resume && typeof parsed.resume === 'object' ? (parsed.resume as Record<string, unknown>) : {};

    return {
      resume: {
        candidate_name: normalizeText(resume.candidate_name),
        contact_line: normalizeText(resume.contact_line),
        resume_headline: normalizeText(resume.resume_headline),
        professional_summary: normalizeText(resume.professional_summary),
        experience: parseFinalExperience(resume.experience),
        additional_sections: parseAdditionalSections(resume.additional_sections)
      },
      fit_risks: asStringArray(parsed.fit_risks),
      suggested_next_step: normalizeText(parsed.suggested_next_step)
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
      'Prioritize rewording existing resume evidence around customer acquisition, outbound follow-up, CRM pipeline management, internet lead pipelines, lead qualification, appointment setting, objection handling, customer discovery, sales cycle progression, face-to-face selling, product education, sales volume, quota, units sold, and revenue activity only when those facts are present in the parsed resume evidence.',
      'If the job description asks for telecom, door-to-door, lobby event, or MDU experience and those facts are absent from the parsed resume evidence, do not write them as experience. Put the gap in fit_risks or address it only through supported transferable evidence.',
      'A supported transferable sentence may describe high-volume customer outreach, prospect follow-up, CRM pipeline management, customer discovery, appointment setting, or objection handling only when similar resume evidence exists.'
    ].join('\n');
  }

  return [
    `Role pack: ${bucket}.`,
    'Use the role bucket only to prioritize relevant parsed resume evidence.',
    'Do not add role-specific duties, tools, credentials, industries, metrics, or accomplishments unless they are present in the parsed resume evidence.'
  ].join('\n');
}

function isThinSourceEvidence(source: SourceEvidence) {
  return (
    !source.candidate_name &&
    !source.contact_line &&
    !source.resume_headline &&
    !source.professional_summary &&
    !source.experience.length &&
    !source.additional_sections.length
  );
}

function buildFallbackOutput(
  source: SourceEvidence,
  submission: SubmissionForFinalOutput,
  fallbackReason: string
): FinalOutput {
  const targetRole = submission.target_role || 'the target role';
  const selectedExperience = source.experience.slice(0, 3);
  const roleTitles = selectedExperience.map((item) => item.role_title).filter(Boolean);
  const fallbackSummary =
    source.professional_summary ||
    (roleTitles.length
      ? `Candidate positioned for ${targetRole} through documented experience as ${roleTitles.join(', ')}. This draft keeps the rewrite limited to the uploaded resume evidence while emphasizing transferable responsibilities relevant to the target role.`
      : 'Resume rewrite limited to the available uploaded resume details. This draft avoids adding unsupported employers, roles, duties, tools, credentials, metrics, or industries.');

  const fitRisks = [
    ...(!source.experience.length
      ? ['The uploaded resume did not provide enough usable work-history detail for a fuller experience rewrite.']
      : []),
    ...(fallbackReason ? ['Some wording was kept conservative to protect against overclaiming from the uploaded resume evidence.'] : []),
    'Any target-job requirement not shown in the uploaded resume should be treated as a fit risk rather than written as experience.'
  ];

  return {
    resume: {
      candidate_name: source.candidate_name || normalizeText(submission.name),
      contact_line: source.contact_line,
      resume_headline: source.resume_headline,
      professional_summary: fallbackSummary,
      experience: selectedExperience.map((item) => ({
        company: item.company,
        role_title: item.role_title,
        date_range: item.date_range,
        bullets: (item.original_bullets.length ? item.original_bullets : ['Responsibilities preserved from the uploaded resume evidence.']).slice(0, 5)
      })),
      additional_sections: source.additional_sections
    },
    fit_risks: fitRisks,
    suggested_next_step:
      'For a stronger application package, Lodestar CV can generate a role-specific DOCX/PDF version and a tighter direct-sales variant for telecom, SDR, or account executive roles.'
  };
}

function buildUnreadableResumeFallback(submission: SubmissionForFinalOutput): FinalOutput {
  return {
    resume: {
      candidate_name: normalizeText(submission.name),
      contact_line: '',
      resume_headline: '',
      professional_summary:
        'The uploaded resume could not be read clearly enough to create an evidence-based rewrite. Please upload a text-based PDF/DOCX or paste resume text when that option is available.',
      experience: [],
      additional_sections: []
    },
    fit_risks: [
      'The uploaded resume text was missing or too short, so Lodestar CV could not safely preserve real employers, titles, dates, or bullets.',
      'The job description was not used as resume evidence.'
    ],
    suggested_next_step:
      'Upload a text-based PDF/DOCX resume and Lodestar CV can generate a grounded final rewrite from the parsed resume evidence.'
  };
}

function validateFinalOutputAgainstSource(output: FinalOutput, source: SourceEvidence) {
  const sourceCompanies = new Set(source.experience.map((item) => item.company).filter(Boolean));
  const sourceRoleTitles = new Set(source.experience.map((item) => item.role_title).filter(Boolean));

  for (const item of output.resume.experience) {
    if (item.company && !sourceCompanies.has(item.company)) {
      return { valid: false, reason: `Generated company not found in source evidence: ${item.company}` };
    }

    if (item.role_title && !sourceRoleTitles.has(item.role_title)) {
      return { valid: false, reason: `Generated role title not found in source evidence: ${item.role_title}` };
    }
  }

  return { valid: true, reason: '' };
}

function getMissingResumeTextSource(submission: SubmissionForFinalOutput): SourceEvidence {
  return {
    candidate_name: normalizeText(submission.name),
    contact_line: '',
    resume_headline: '',
    professional_summary: '',
    experience: [],
    additional_sections: []
  };
}

async function callOpenAiJson(messages: Array<{ role: 'system' | 'user'; content: string }>, temperature: number) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature,
      messages,
      response_format: { type: 'json_object' }
    })
  });

  if (!res.ok) {
    return { content: null, error: await res.text() };
  }

  const data = await res.json();
  return { content: data?.choices?.[0]?.message?.content || null, error: null };
}

export async function generatePaidFinalOutput(submission: SubmissionForFinalOutput) {
  const targetRole = submission.target_role || 'Target role';
  const jobDescription = submission.job_description || '';
  const roleBucket = detectRoleBucket(targetRole, jobDescription);
  const rolePack = getRolePack(roleBucket);
  const resumeText = normalizeText(submission.resume_text);

  if (resumeText.length < 80) {
    return {
      output: buildUnreadableResumeFallback(submission),
      status: 'generated_demo',
      error: 'Parsed resume text is missing or too short for grounded final output.'
    };
  }

  if (!process.env.OPENAI_API_KEY) {
    const source = getMissingResumeTextSource(submission);
    return {
      output: buildFallbackOutput(source, submission, 'Missing OpenAI API key.'),
      status: 'generated_demo',
      error: null
    };
  }

  try {
    const stageA = await callOpenAiJson(
      [
        {
          role: 'system',
          content: [
            'Stage A: Parse the uploaded resume into structured source evidence.',
            'Return JSON only with exactly these keys: candidate_name string, contact_line string, resume_headline string, professional_summary string, experience array, additional_sections array.',
            'Experience entries must preserve company, role_title, date_range, and original_bullets from the uploaded resume. Use empty strings for missing company, role title, or dates.',
            'Additional sections may include only skills, technology, education, certifications, or similar sections present in the uploaded resume. Preserve Technology as Technology when present.',
            'Do not infer, rewrite, improve, normalize beyond punctuation/capitalization, or add employers, titles, dates, duties, tools, industries, credentials, skills, metrics, or work history.',
            'If a field is not present in the uploaded resume text, return an empty string or empty array.'
          ].join('\n')
        },
        {
          role: 'user',
          content: `Uploaded resume text:\n${resumeText}`
        }
      ],
      0
    );

    if (!stageA.content) {
      const fallbackSource = getMissingResumeTextSource(submission);
      return {
        output: buildFallbackOutput(fallbackSource, submission, 'Stage A failed.'),
        status: 'generated_demo',
        error: stageA.error || 'OpenAI returned no parsed source evidence.'
      };
    }

    const sourceEvidence = parseSourceEvidence(stageA.content);

    if (!sourceEvidence || isThinSourceEvidence(sourceEvidence)) {
      const fallbackSource = sourceEvidence || getMissingResumeTextSource(submission);
      return {
        output: buildFallbackOutput(fallbackSource, submission, 'Stage A returned thin source evidence.'),
        status: 'generated_demo',
        error: 'OpenAI returned invalid or thin parsed source evidence.'
      };
    }

    const stageB = await callOpenAiJson(
      [
        {
          role: 'system',
          content: [
            'Stage B: Rewrite only the parsed source evidence toward the target job description.',
            'This product is a resume rewrite, not a resume advice report. Return a ready-to-use rewritten resume draft plus separate fit risks.',
            'Return JSON only in this exact shape: {"resume":{"candidate_name":string,"contact_line":string,"resume_headline":string,"professional_summary":string,"experience":[{"company":string,"role_title":string,"date_range":string,"bullets":string[]}],"additional_sections":[{"section_title":string,"items":string[]}]},"fit_risks":string[],"suggested_next_step":string}.',
            'Do not include core_skills, keyword_alignment, cover_note, outreach_message, next_application_moves, cover letters, outreach messages, generic application advice, or keyword lists.',
            'You must not create new employers, companies, job titles, dates, metrics, tools, certifications, industries, responsibilities, work history, technical skills, telecom experience, door-to-door experience, lobby event experience, or MDU experience.',
            'If a duty, skill, keyword, industry, or sales motion appears only in the job description and not in parsed source evidence, it cannot be written as experience. Put it in fit_risks or address it only through transferable evidence that appears in the parsed resume.',
            'Preserve company names exactly as parsed. Preserve role titles exactly as parsed unless lightly normalizing punctuation/capitalization. Preserve date ranges; if absent use an empty string.',
            'Include a maximum of 3 experience entries. If more than 3 roles exist, choose the 3 most relevant to the target job. Never replace multiple jobs with one invented job.',
            'Each included role should have 3 to 5 rewritten bullets. Every bullet must be based on original bullets from that same role. Do not move achievements from one employer to another. Do not invent metrics.',
            'Rewrite the professional summary using actual resume evidence and target role alignment only through transferable experience.',
            'Avoid these phrases: dynamic and motivated, eager to leverage, passionate about, proven ability unless supported by evidence, successfully increasing brand awareness, results-driven professional, team player.',
            'Do not create Core Skills or Keyword Alignment sections. Only include additional sections if the parsed resume had a skills, technology, education, certification, or similar section. Include only items present in parsed source evidence and avoid duplicate Skills/Technology content.',
            'Fit risks must be separate from the resume, identify gaps without sounding like rejection, and protect against overclaiming.',
            'Suggested next step must be a soft Lodestar upsell and must not tell the user to rewrite the resume themselves.',
            `Available Lodestar researched role buckets: ${roleBuckets.join(', ')}.`,
            rolePack
          ].join('\n')
        },
        {
          role: 'user',
          content: [
            `Target role: ${targetRole}`,
            `Detected role bucket: ${roleBucket}`,
            `Parsed source evidence JSON: ${JSON.stringify(sourceEvidence)}`,
            `Job description: ${jobDescription}`
          ].join('\n\n')
        }
      ],
      0.15
    );

    if (!stageB.content) {
      return {
        output: buildFallbackOutput(sourceEvidence, submission, 'Stage B failed.'),
        status: 'generated_demo',
        error: stageB.error || 'OpenAI returned no final output.'
      };
    }

    const output = parseFinalOutput(stageB.content);

    if (!output) {
      return {
        output: buildFallbackOutput(sourceEvidence, submission, 'Stage B returned invalid final output JSON.'),
        status: 'generated_demo',
        error: 'OpenAI returned an invalid final output payload.'
      };
    }

    const validation = validateFinalOutputAgainstSource(output, sourceEvidence);

    if (!validation.valid) {
      return {
        output: buildFallbackOutput(sourceEvidence, submission, validation.reason),
        status: 'generated_demo',
        error: validation.reason
      };
    }

    return { output, status: 'generated', error: null };
  } catch (error) {
    const fallbackSource = getMissingResumeTextSource(submission);
    return {
      output: buildFallbackOutput(fallbackSource, submission, 'OpenAI final output failed.'),
      status: 'generated_demo',
      error: error instanceof Error ? error.message : 'OpenAI final output failed.'
    };
  }
}
