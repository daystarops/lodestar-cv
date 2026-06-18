import type { FinalOutput } from './finalOutput';

type SendFinalRewriteEmailParams = {
  to: string;
  name?: string | null;
  targetRole?: string | null;
  finalOutput: FinalOutput;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value : value == null ? '' : String(value);
}

function normalizeList(items: unknown) {
  if (!Array.isArray(items)) return [];

  return items.map(normalizeText).map((item) => item.trim()).filter(Boolean);
}

function formatList(items: unknown) {
  const normalizedItems = normalizeList(items);
  if (!normalizedItems.length) return 'Not provided';

  return normalizedItems.map((item) => `- ${item}`).join('\n');
}

function formatHtmlList(items: unknown) {
  const normalizedItems = normalizeList(items);
  if (!normalizedItems.length) return '<p>Not provided</p>';

  return `<ul>${normalizedItems.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

function normalizeResume(finalOutput: FinalOutput) {
  const resume = finalOutput.resume || {
    candidate_name: '',
    contact_line: '',
    resume_headline: '',
    professional_summary: '',
    experience: [],
    additional_sections: []
  };

  return {
    candidate_name: normalizeText(resume.candidate_name).trim(),
    contact_line: normalizeText(resume.contact_line).trim(),
    resume_headline: normalizeText(resume.resume_headline).trim(),
    professional_summary: normalizeText(resume.professional_summary).trim(),
    experience: Array.isArray(resume.experience) ? resume.experience : [],
    additional_sections: Array.isArray(resume.additional_sections) ? resume.additional_sections : []
  };
}

function normalizeExperience(finalOutput: FinalOutput) {
  return normalizeResume(finalOutput).experience.map((item) => {
    const experience = item && typeof item === 'object' ? item : {};

    return {
      company: normalizeText('company' in experience ? experience.company : '').trim(),
      role_title: normalizeText('role_title' in experience ? experience.role_title : '').trim(),
      date_range: normalizeText('date_range' in experience ? experience.date_range : '').trim(),
      bullets: normalizeList('bullets' in experience ? experience.bullets : [])
    };
  });
}

function normalizeAdditionalSections(finalOutput: FinalOutput) {
  return normalizeResume(finalOutput).additional_sections
    .map((item) => {
      const section = item && typeof item === 'object' ? item : {};

      return {
        section_title: normalizeText('section_title' in section ? section.section_title : '').trim(),
        items: normalizeList('items' in section ? section.items : [])
      };
    })
    .filter((section) => section.section_title && section.items.length);
}

function formatExperienceText(finalOutput: FinalOutput) {
  const experiences = normalizeExperience(finalOutput);
  if (!experiences.length) return 'Not provided';

  return experiences
    .map((experience) =>
      [
        [
          experience.role_title || 'Not provided',
          experience.company,
          experience.date_range
        ]
          .filter(Boolean)
          .join(' | '),
        formatList(experience.bullets)
      ].join('\n')
    )
    .join('\n\n');
}

function formatExperienceHtml(finalOutput: FinalOutput) {
  const experiences = normalizeExperience(finalOutput);
  if (!experiences.length) return '<p>Not provided</p>';

  return experiences
    .map((experience) => {
      const heading = [
        experience.role_title || 'Not provided',
        experience.company,
        experience.date_range
      ]
        .filter(Boolean)
        .join(' | ');

      return `<section><h4>${escapeHtml(heading)}</h4>${formatHtmlList(experience.bullets)}</section>`;
    })
    .join('');
}

function formatAdditionalSectionsText(finalOutput: FinalOutput) {
  const sections = normalizeAdditionalSections(finalOutput);
  if (!sections.length) return '';

  return sections
    .map((section) => [section.section_title, formatList(section.items)].join('\n'))
    .join('\n\n');
}

function formatAdditionalSectionsHtml(finalOutput: FinalOutput) {
  const sections = normalizeAdditionalSections(finalOutput);
  if (!sections.length) return '';

  return sections
    .map(
      (section) =>
        `<h3>${escapeHtml(section.section_title)}</h3>${formatHtmlList(section.items)}`
    )
    .join('');
}

export function formatFinalRewriteText(finalOutput: FinalOutput) {
  const resume = normalizeResume(finalOutput);
  const additionalSections = formatAdditionalSectionsText(finalOutput);

  return [
    'Lodestar CV',
    'Positioned for what\'s next.',
    '',
    resume.candidate_name || 'Not provided',
    resume.contact_line,
    resume.resume_headline,
    '',
    'Professional Summary',
    resume.professional_summary || 'Not provided',
    '',
    'Experience',
    formatExperienceText(finalOutput),
    ...(additionalSections ? ['', additionalSections] : []),
    '',
    'Fit risks',
    formatList(finalOutput.fit_risks),
    '',
    'Suggested next step',
    normalizeText(finalOutput.suggested_next_step) || 'Not provided',
    '',
    'Questions? Reply here or contact support@lodestarcv.com.'
  ]
    .filter((line, index, lines) => line || lines[index - 1])
    .join('\n');
}

function formatFinalRewriteHtml(finalOutput: FinalOutput) {
  const resume = normalizeResume(finalOutput);
  const additionalSections = formatAdditionalSectionsHtml(finalOutput);

  return [
    '<div style="font-family:Arial,sans-serif;color:#1f2933;line-height:1.5;max-width:720px;">',
    '<h1 style="margin:0 0 4px;font-size:24px;">Lodestar CV</h1>',
    '<p style="margin:0 0 20px;color:#52606d;">Positioned for what&#039;s next.</p>',
    '<p>Hi,</p>',
    `<h2>${escapeHtml(resume.candidate_name || 'Not provided')}</h2>`,
    resume.contact_line ? `<p>${escapeHtml(resume.contact_line)}</p>` : '',
    resume.resume_headline ? `<h3>${escapeHtml(resume.resume_headline)}</h3>` : '',
    '<h3>Professional Summary</h3>',
    `<p>${escapeHtml(resume.professional_summary || 'Not provided')}</p>`,
    '<h3>Experience</h3>',
    formatExperienceHtml(finalOutput),
    additionalSections,
    '<h3>Fit risks</h3>',
    formatHtmlList(finalOutput.fit_risks),
    '<h3>Suggested next step</h3>',
    `<p>${escapeHtml(normalizeText(finalOutput.suggested_next_step) || 'Not provided')}</p>`,
    '<p>Questions? Reply here or contact <a href="mailto:support@lodestarcv.com">support@lodestarcv.com</a>.</p>',
    '</div>'
  ].join('');
}

export async function sendFinalRewriteEmail({
  to,
  name,
  targetRole,
  finalOutput
}: SendFinalRewriteEmailParams) {
  if (!process.env.RESEND_API_KEY) {
    return {
      status: 'skipped_missing_resend_api_key',
      sentAt: null,
      error: 'RESEND_API_KEY is not configured.'
    };
  }

  if (!process.env.FROM_EMAIL) {
    return {
      status: 'skipped_missing_from_email',
      sentAt: null,
      error: 'FROM_EMAIL is not configured.'
    };
  }

  try {
    const emailPayload = {
      from: process.env.FROM_EMAIL,
      to,
      subject: `Your Lodestar CV rewrite${targetRole ? ` for ${targetRole}` : ''}`,
      text: `Hi ${name || 'there'},\n\n${formatFinalRewriteText(finalOutput)}`,
      html: formatFinalRewriteHtml(finalOutput).replace('<p>Hi,</p>', `<p>Hi ${escapeHtml(name || 'there')},</p>`),
      ...(process.env.REPLY_TO ? { reply_to: process.env.REPLY_TO } : {})
    };

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailPayload)
    });

    if (!res.ok) {
      return {
        status: 'failed',
        sentAt: null,
        error: await res.text()
      };
    }

    return {
      status: 'sent',
      sentAt: new Date().toISOString(),
      error: null
    };
  } catch (error) {
    return {
      status: 'failed',
      sentAt: null,
      error: error instanceof Error ? error.message : 'Resend email failed.'
    };
  }
}
