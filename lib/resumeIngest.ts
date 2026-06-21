export type ParserStatus = 'parsed' | 'empty' | 'unsupported' | 'failed';
export type ParserProvider = 'local' | 'openai_file' | 'none';

export type ParsedResume = {
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

export type ResumeIngestResult = {
  resumeText: string;
  parsedResume: ParsedResume | null;
  parserStatus: ParserStatus;
  parserProvider: ParserProvider;
  parserError?: string;
  parsedAt?: string;
};

const MIN_RESUME_TEXT_LENGTH = 80;

function normalizeWhitespace(text: string) {
  return text.replace(/\s+/g, ' ').trim();
}

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : value == null ? '' : String(value).trim();
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.map(normalizeText).filter(Boolean) : [];
}

function getExtension(fileName: string) {
  const match = fileName.toLowerCase().match(/\.([a-z0-9]+)$/);
  return match?.[1] || '';
}

function isPdf(buffer: Buffer) {
  return buffer.subarray(0, 4).toString('ascii') === '%PDF';
}

function isZip(buffer: Buffer) {
  if (buffer.length < 4) return false;

  return (
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    ((buffer[2] === 0x03 && buffer[3] === 0x04) ||
      (buffer[2] === 0x05 && buffer[3] === 0x06) ||
      (buffer[2] === 0x07 && buffer[3] === 0x08))
  );
}

function getFileKind(file: File, buffer: Buffer) {
  const extension = getExtension(file.name || '');
  const type = (file.type || '').toLowerCase();

  if (isPdf(buffer)) return 'pdf';
  if (isZip(buffer) && extension === 'docx') return 'docx';
  if (type.startsWith('text/') || extension === 'txt') return 'txt';
  if (type === 'application/pdf' || extension === 'pdf') return 'pdf';

  return 'unsupported';
}

function toSafeParserError(error: unknown) {
  if (error instanceof Error && error.message.toLowerCase().includes('password')) {
    return 'Could not parse the resume because the file appears to be password protected.';
  }

  return 'Could not extract text from this resume. Please upload a readable PDF, DOCX, or TXT file.';
}

async function loadPdfParser() {
  try {
    const pdfParse = await import('pdf-parse');
    return pdfParse.PDFParse;
  } catch {
    return null;
  }
}

async function loadDocxParser() {
  try {
    const mammoth = await import('mammoth');
    return mammoth.default || mammoth;
  } catch {
    return null;
  }
}

function parseExperience(value: unknown): ParsedResume['experience'] {
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
    .filter((item) => item.company || item.role_title || item.date_range || item.original_bullets.length);
}

function parseAdditionalSections(value: unknown): ParsedResume['additional_sections'] {
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

export function coerceParsedResume(value: unknown): ParsedResume | null {
  const record = value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
  if (!record) return null;

  const parsed = {
    candidate_name: normalizeText(record.candidate_name),
    contact_line: normalizeText(record.contact_line || record.contact_information),
    resume_headline: normalizeText(record.resume_headline || record.headline),
    professional_summary: normalizeText(record.professional_summary || record.summary),
    experience: parseExperience(record.experience),
    additional_sections: parseAdditionalSections(record.additional_sections)
  };

  return isThinParsedResume(parsed) ? null : parsed;
}

function isThinParsedResume(parsed: ParsedResume) {
  return (
    !parsed.candidate_name &&
    !parsed.contact_line &&
    !parsed.resume_headline &&
    !parsed.professional_summary &&
    !parsed.experience.length &&
    !parsed.additional_sections.length
  );
}

function parsedResumeFromText(text: string): ParsedResume | null {
  const normalized = normalizeWhitespace(text);
  if (normalized.length < MIN_RESUME_TEXT_LENGTH) return null;

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return {
    candidate_name: lines[0] || '',
    contact_line: lines.slice(1, 3).join(' | '),
    resume_headline: '',
    professional_summary: '',
    experience: [],
    additional_sections: [
      {
        section_title: 'Extracted Resume Text',
        items: [normalized.slice(0, 4000)]
      }
    ]
  };
}

async function extractLocalText(file: File, buffer: Buffer) {
  const fileKind = getFileKind(file, buffer);

  if (fileKind === 'unsupported') {
    return {
      resumeText: '',
      parserStatus: 'unsupported' as const,
      parserProvider: 'none' as const,
      parserError: 'Unsupported resume file type. Please upload a PDF, DOCX, or TXT file.'
    };
  }

  if (fileKind === 'pdf') {
    const PDFParse = await loadPdfParser();
    if (!PDFParse) {
      return {
        resumeText: '',
        parserStatus: 'failed' as const,
        parserProvider: 'none' as const,
        parserError: 'PDF parser failed to load'
      };
    }

    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    try {
      const parsed = await parser.getText();
      const resumeText = normalizeWhitespace(parsed.text || '');
      return {
        resumeText: resumeText.length >= MIN_RESUME_TEXT_LENGTH ? resumeText : '',
        parserStatus: resumeText.length >= MIN_RESUME_TEXT_LENGTH ? ('parsed' as const) : ('empty' as const),
        parserProvider: resumeText.length >= MIN_RESUME_TEXT_LENGTH ? ('local' as const) : ('none' as const),
        parserError:
          resumeText.length >= MIN_RESUME_TEXT_LENGTH ? undefined : 'Could not find enough resume text in this file.'
      };
    } finally {
      await parser.destroy();
    }
  }

  if (fileKind === 'docx') {
    const mammoth = await loadDocxParser();
    if (!mammoth) {
      return {
        resumeText: '',
        parserStatus: 'failed' as const,
        parserProvider: 'none' as const,
        parserError: 'DOCX parser failed to load'
      };
    }

    const parsed = await mammoth.extractRawText({ buffer });
    const resumeText = normalizeWhitespace(parsed.value || '');
    return {
      resumeText: resumeText.length >= MIN_RESUME_TEXT_LENGTH ? resumeText : '',
      parserStatus: resumeText.length >= MIN_RESUME_TEXT_LENGTH ? ('parsed' as const) : ('empty' as const),
      parserProvider: resumeText.length >= MIN_RESUME_TEXT_LENGTH ? ('local' as const) : ('none' as const),
      parserError:
        resumeText.length >= MIN_RESUME_TEXT_LENGTH ? undefined : 'Could not find enough resume text in this file.'
    };
  }

  const resumeText = normalizeWhitespace(buffer.toString('utf8'));
  return {
    resumeText: resumeText.length >= MIN_RESUME_TEXT_LENGTH ? resumeText : '',
    parserStatus: resumeText.length >= MIN_RESUME_TEXT_LENGTH ? ('parsed' as const) : ('empty' as const),
    parserProvider: resumeText.length >= MIN_RESUME_TEXT_LENGTH ? ('local' as const) : ('none' as const),
    parserError:
      resumeText.length >= MIN_RESUME_TEXT_LENGTH ? undefined : 'Could not find enough resume text in this file.'
  };
}

function parsedResumeSchema() {
  return {
    type: 'object',
    additionalProperties: false,
    required: [
      'candidate_name',
      'contact_line',
      'resume_headline',
      'professional_summary',
      'experience',
      'additional_sections'
    ],
    properties: {
      candidate_name: { type: 'string' },
      contact_line: { type: 'string' },
      resume_headline: { type: 'string' },
      professional_summary: { type: 'string' },
      experience: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['company', 'role_title', 'date_range', 'original_bullets'],
          properties: {
            company: { type: 'string' },
            role_title: { type: 'string' },
            date_range: { type: 'string' },
            original_bullets: { type: 'array', items: { type: 'string' } }
          }
        }
      },
      additional_sections: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['section_title', 'items'],
          properties: {
            section_title: { type: 'string' },
            items: { type: 'array', items: { type: 'string' } }
          }
        }
      }
    }
  };
}

async function extractWithOpenAiFile(file: File, buffer: Buffer) {
  if (!process.env.OPENAI_API_KEY) {
    return { parsedResume: null, error: 'OpenAI API key is not configured.' };
  }

  const fileData = `data:${file.type || 'application/octet-stream'};base64,${buffer.toString('base64')}`;
  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0,
      input: [
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: [
                'Extract source evidence from the attached resume file.',
                'Return strict JSON matching the schema.',
                'Do not rewrite, improve, infer, summarize beyond the source, or use any job description.',
                'Preserve employers, role titles, dates, bullets, skills, education, certifications, tools, metrics, industries, and responsibilities only when they appear in the resume.',
                'Use empty strings or empty arrays when a field is missing.'
              ].join('\n')
            },
            {
              type: 'input_file',
              filename: file.name || 'resume',
              file_data: fileData
            }
          ]
        }
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'parsed_resume',
          strict: true,
          schema: parsedResumeSchema()
        }
      }
    })
  });

  if (!res.ok) {
    return { parsedResume: null, error: `OpenAI file extraction failed: ${await res.text()}` };
  }

  const data = await res.json();
  const content =
    data?.output_text ||
    data?.output?.flatMap((item: { content?: Array<{ text?: string }> }) => item.content || [])?.[0]?.text ||
    '';

  try {
    return { parsedResume: coerceParsedResume(JSON.parse(content)), error: null };
  } catch {
    return { parsedResume: null, error: 'OpenAI file extraction returned invalid JSON.' };
  }
}

export async function ingestResumeFile(file: File): Promise<ResumeIngestResult> {
  const parsedAt = new Date().toISOString();

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const local = await extractLocalText(file, buffer).catch((error) => ({
      resumeText: '',
      parserStatus: 'failed' as const,
      parserProvider: 'none' as const,
      parserError: toSafeParserError(error)
    }));

    if (local.parserStatus === 'parsed' && local.resumeText.length >= MIN_RESUME_TEXT_LENGTH) {
      const openAi = await extractWithOpenAiFile(file, buffer).catch((error) => ({
        parsedResume: null,
        error: error instanceof Error ? error.message : 'OpenAI file extraction failed.'
      }));

      return {
        resumeText: local.resumeText,
        parsedResume: openAi.parsedResume || parsedResumeFromText(local.resumeText),
        parserStatus: 'parsed',
        parserProvider: openAi.parsedResume ? 'openai_file' : 'local',
        parserError: openAi.parsedResume ? undefined : local.parserError,
        parsedAt
      };
    }

    if (local.parserStatus !== 'unsupported') {
      const openAi = await extractWithOpenAiFile(file, buffer).catch((error) => ({
        parsedResume: null,
        error: error instanceof Error ? error.message : 'OpenAI file extraction failed.'
      }));

      if (openAi.parsedResume) {
        return {
          resumeText: local.resumeText,
          parsedResume: openAi.parsedResume,
          parserStatus: 'parsed',
          parserProvider: 'openai_file',
          parserError: undefined,
          parsedAt
        };
      }

      return {
        resumeText: local.resumeText,
        parsedResume: null,
        parserStatus: local.parserStatus === 'empty' ? 'empty' : 'failed',
        parserProvider: 'none',
        parserError: openAi.error || local.parserError,
        parsedAt
      };
    }

    return {
      resumeText: '',
      parsedResume: null,
      parserStatus: 'unsupported',
      parserProvider: 'none',
      parserError: local.parserError,
      parsedAt
    };
  } catch (error) {
    return {
      resumeText: '',
      parsedResume: null,
      parserStatus: 'failed',
      parserProvider: 'none',
      parserError: toSafeParserError(error),
      parsedAt
    };
  }
}
