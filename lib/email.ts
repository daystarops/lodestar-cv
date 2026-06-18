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

function normalizeExperience(finalOutput: FinalOutput) {
  const experiences = Array.isArray(finalOutput.rewritten_experience) ? finalOutput.rewritten_experience : [];

  return experiences.map((item) => {
    const experience = item && typeof item === 'object' ? item : {};

    return {
      company: normalizeText('company' in experience ? experience.company : '').trim(),
      role_title: normalizeText('role_title' in experience ? experience.role_title : '').trim(),
      bullets: normalizeList('bullets' in experience ? experience.bullets : [])
    };
  });
}

function formatExperienceText(finalOutput: FinalOutput) {
  const experiences = normalizeExperience(finalOutput);
  if (!experiences.length) return 'Not provided';

  return experiences
    .map((experience) =>
      [
        `${experience.role_title || 'Not provided'}${experience.company ? `, ${experience.company}` : ''}`,
        formatList(experience.bullets)
      ].join('\n')
    )
    .join('\n\n');
}

function formatExperienceHtml(finalOutput: FinalOutput) {
  const experiences = normalizeExperience(finalOutput);
  if (!experiences.length) return '<p>Not provided</p>';

  return experiences
    .map(
      (experience) =>
        `<section><h4>${escapeHtml(experience.role_title || 'Not provided')}${
          experience.company ? `, ${escapeHtml(experience.company)}` : ''
        }</h4>${formatHtmlList(experience.bullets)}</section>`
    )
    .join('');
}

export function formatFinalRewriteText(finalOutput: FinalOutput) {
  return [
    'Lodestar CV',
    'Positioned for what\'s next.',
    '',
    normalizeText(finalOutput.resume_title) || 'Not provided',
    '',
    'Summary',
    normalizeText(finalOutput.rewritten_summary) || 'Not provided',
    '',
    'Core skills',
    formatList(finalOutput.core_skills),
    '',
    'Experience',
    formatExperienceText(finalOutput),
    '',
    'Technology',
    formatList(finalOutput.technology),
    '',
    'Keyword alignment',
    formatList(finalOutput.keyword_alignment),
    '',
    'Fit risks',
    formatList(finalOutput.fit_risks),
    '',
    'Suggested next step',
    normalizeText(finalOutput.suggested_next_step) || 'Not provided',
    '',
    'Questions? Reply here or contact support@lodestarcv.com.'
  ].join('\n');
}

function formatFinalRewriteHtml(finalOutput: FinalOutput) {
  return [
    '<div style="font-family:Arial,sans-serif;color:#1f2933;line-height:1.5;max-width:720px;">',
    '<h1 style="margin:0 0 4px;font-size:24px;">Lodestar CV</h1>',
    '<p style="margin:0 0 20px;color:#52606d;">Positioned for what&#039;s next.</p>',
    '<p>Hi,</p>',
    '<p>Your completed resume rewrite is below. It is written to stay grounded in the resume evidence you provided while aligning to the target role.</p>',
    `<h2>${escapeHtml(normalizeText(finalOutput.resume_title) || 'Not provided')}</h2>`,
    '<h3>Summary</h3>',
    `<p>${escapeHtml(normalizeText(finalOutput.rewritten_summary) || 'Not provided')}</p>`,
    '<h3>Core skills</h3>',
    formatHtmlList(finalOutput.core_skills),
    '<h3>Experience</h3>',
    formatExperienceHtml(finalOutput),
    '<h3>Technology</h3>',
    formatHtmlList(finalOutput.technology),
    '<h3>Keyword alignment</h3>',
    formatHtmlList(finalOutput.keyword_alignment),
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
