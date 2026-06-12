import { createHmac, timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { updateSubmission, updateSubmissionByStripeSessionId } from '@/lib/supabaseRest';

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
      const session = event.data.object;
      await updateSubmissionForSession(session, {
        paymentStatus: 'paid',
        paidAt: new Date().toISOString(),
        stripePaymentIntent: getPaymentIntentId(session)
      });
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
