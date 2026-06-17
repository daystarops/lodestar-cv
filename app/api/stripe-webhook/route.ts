import { createHmac, timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { generatePaidFinalOutput } from '@/lib/finalOutput';
import { sendFinalRewriteEmail } from '@/lib/email';
import {
  getSubmission,
  getSubmissionByStripeSessionId,
  updateSubmission,
  updateSubmissionByStripeSessionId
} from '@/lib/supabaseRest';

type StripeCheckoutSession = {
  id: string;
  metadata?: {
    submissionId?: string;
    submission_id?: string;
  } | null;
  payment_intent?: string | { id?: string } | null;
};

type StripeWebhookEvent = {
  type: string;
  data: {
    object: StripeCheckoutSession;
  };
};

function verifyStripeSignature(body: string, signatureHeader: string, secret: string) {
  const parts = signatureHeader.split(',').reduce<Record<string, string[]>>((acc, part) => {
    const [key, value] = part.split('=');
    if (!key || !value) return acc;
    acc[key] = [...(acc[key] || []), value];
    return acc;
  }, {});

  const timestamp = parts.t?.[0];
  const signatures = parts.v1 || [];

  if (!timestamp || !signatures.length) {
    return false;
  }

  const expected = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
  const expectedBuffer = Buffer.from(expected, 'hex');

  return signatures.some((signature) => {
    const signatureBuffer = Buffer.from(signature, 'hex');
    return (
      signatureBuffer.length === expectedBuffer.length &&
      timingSafeEqual(signatureBuffer, expectedBuffer)
    );
  });
}

function getPaymentIntentId(session: StripeCheckoutSession) {
  if (typeof session.payment_intent === 'string') {
    return session.payment_intent;
  }

  return session.payment_intent?.id || '';
}

async function updateSubmissionForSession(
  session: StripeCheckoutSession,
  payload: Parameters<typeof updateSubmission>[1]
) {
  const submissionId = session.metadata?.submissionId || session.metadata?.submission_id || '';

  if (submissionId) {
    return updateSubmission(submissionId, payload);
  }

  if (session.id) {
    return updateSubmissionByStripeSessionId(session.id, payload);
  }

  return null;
}

async function findSubmissionForSession(session: StripeCheckoutSession) {
  const submissionId = session.metadata?.submissionId || session.metadata?.submission_id || '';

  if (submissionId) {
    const submission = await getSubmission(submissionId);
    if (submission) return submission;
  }

  if (session.id) {
    return getSubmissionByStripeSessionId(session.id);
  }

  return null;
}

async function fulfillCompletedCheckout(session: StripeCheckoutSession) {
  let submission = await findSubmissionForSession(session);
  const paidAt = new Date().toISOString();

  submission =
    (await updateSubmissionForSession(session, {
      paymentStatus: 'paid',
      paidAt,
      stripePaymentIntent: getPaymentIntentId(session)
    })) || submission;

  if (!submission) {
    throw new Error('No matching submission found for Stripe checkout session.');
  }

  let finalOutput = submission.final_output;

  if (!finalOutput) {
    await updateSubmission(String(submission.id), {
      finalStatus: 'generating',
      finalError: null
    });

    const generated = await generatePaidFinalOutput(submission);
    finalOutput = generated.output;

    submission = await updateSubmission(String(submission.id), {
      finalStatus: generated.status,
      finalOutput,
      finalError: generated.error,
      finalGeneratedAt: new Date().toISOString()
    });
  }

  if (!submission.email) {
    await updateSubmission(String(submission.id), {
      emailStatus: 'failed',
      emailError: 'Submission is missing customer email.'
    });
    return;
  }

  if (submission.email_status === 'sent') {
    return;
  }

  const emailResult = await sendFinalRewriteEmail({
    to: submission.email,
    name: submission.name,
    targetRole: submission.target_role,
    finalOutput
  });

  await updateSubmission(String(submission.id), {
    emailStatus: emailResult.status,
    emailSentAt: emailResult.sentAt,
    emailError: emailResult.error
  });
}

export async function POST(req: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return NextResponse.json({ received: true, skipped: true });
  }

  const body = await req.text();
  const signature = req.headers.get('stripe-signature') || '';

  if (!verifyStripeSignature(body, signature, webhookSecret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  let event: StripeWebhookEvent;

  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      await fulfillCompletedCheckout(event.data.object);
    }

    if (event.type === 'checkout.session.expired') {
      await updateSubmissionForSession(event.data.object, {
        paymentStatus: 'abandoned'
      });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Webhook failed' },
      { status: 500 }
    );
  }
}
