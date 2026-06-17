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

function formatList(items: string[]) {
  return items.map((item) => `- ${item}`).join('\n');
}

function formatHtmlList(items: string[]) {
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

export function formatFinalRewriteText(finalOutput: FinalOutput) {
  return [
    'Rewritten summary',
    finalOutput.rewritten_summary,
    '',
    'Rewritten experience bullets',
    formatList(finalOutput.rewritten_experience_bullets),
    '',
    'Keyword alignment',
    formatList(finalOutput.keyword_alignment),
    '',
    'Cover note',
    finalOutput.cover_note,
    '',
    'Outreach message',
    finalOutput.outreach_message,
    '',
    'Fit risks',
    formatList(finalOutput.fit_risks),
    '',
    'Next application moves',
    formatList(finalOutput.next_application_moves)
  ].join('\n');
}

function formatFinalRewriteHtml(finalOutput: FinalOutput) {
  return [
    '<h2>Your Lodestar CV rewrite</h2>',
    '<h3>Rewritten summary</h3>',
    `<p>${escapeHtml(finalOutput.rewritten_summary)}</p>`,
    '<h3>Rewritten experience bullets</h3>',
    formatHtmlList(finalOutput.rewritten_experience_bullets),
    '<h3>Keyword alignment</h3>',
    formatHtmlList(finalOutput.keyword_alignment),
    '<h3>Cover note</h3>',
    `<p>${escapeHtml(finalOutput.cover_note)}</p>`,
    '<h3>Outreach message</h3>',
    `<p>${escapeHtml(finalOutput.outreach_message)}</p>`,
    '<h3>Fit risks</h3>',
    formatHtmlList(finalOutput.fit_risks),
    '<h3>Next application moves</h3>',
    formatHtmlList(finalOutput.next_application_moves)
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
      html: `<p>Hi ${escapeHtml(name || 'there')},</p>${formatFinalRewriteHtml(finalOutput)}`,
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
