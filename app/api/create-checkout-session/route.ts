import { NextResponse } from 'next/server';
import { appConfig, getOrigin } from '@/lib/config';
import { createSubmission, updateSubmission } from '@/lib/supabaseRest';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email || '');
    const name = String(body.name || '');
    const targetRole = String(body.targetRole || 'Resume rewrite');
    const jobDescription = String(body.jobDescription || '');
    const extraContext = String(body.extraContext || '');
    const resumeFileName = String(body.resumeFileName || '');
    const resumePath = String(body.resumePath || '');
    const preview = body.preview || null;
    const submissionId = String(body.submissionId || '');

    if (!email) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }

    const submissionPayload = {
      email,
      name,
      targetRole,
      jobDescription,
      extraContext,
      resumeFileName,
      resumePath,
      preview,
      paymentStatus: 'checkout_started'
    };

    let submission = submissionId
      ? await updateSubmission(submissionId, submissionPayload)
      : await createSubmission(submissionPayload);

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({
        url: `/success?demo=1&submission=${submission?.id || ''}`,
        demo: true
      });
    }

    const origin = getOrigin(req);
    const params = new URLSearchParams();
    params.set('mode', 'payment');
    params.set('success_url', `${origin}/success?session_id={CHECKOUT_SESSION_ID}`);
    params.set('cancel_url', `${origin}/?checkout=cancelled`);
    params.set('customer_email', email);
    params.set('metadata[submissionId]', String(submission?.id || ''));
    params.set('metadata[submission_id]', String(submission?.id || ''));
    params.set('line_items[0][quantity]', '1');

    if (process.env.STRIPE_PRICE_ID) {
      params.set('line_items[0][price]', process.env.STRIPE_PRICE_ID);
    } else {
      params.set('line_items[0][price_data][currency]', appConfig.checkoutCurrency);
      params.set('line_items[0][price_data][unit_amount]', String(appConfig.checkoutAmountCents));
      params.set('line_items[0][price_data][product_data][name]', 'Lodestar CV Resume Rewrite');
    }

    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params
    });

    if (!stripeRes.ok) {
      const message = await stripeRes.text();
      throw new Error(`Stripe checkout failed: ${message}`);
    }

    const session = await stripeRes.json();
    submission = await updateSubmission(String(submission?.id || submissionId), {
      stripeSessionId: session.id,
      checkoutUrl: session.url,
      paymentStatus: 'checkout_started'
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Checkout failed' },
      { status: 500 }
    );
  }
}
