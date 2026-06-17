import Link from 'next/link';
import LodestarMark from '@/components/LodestarMark';
import { formatFinalRewriteText } from '@/lib/email';
import { getSubmission, getSubmissionByStripeSessionId } from '@/lib/supabaseRest';

type SuccessPageProps = {
  searchParams?: Promise<{
    session_id?: string;
    submission?: string;
    demo?: string;
  }>;
};

async function getFinalOutputBackup(searchParams?: SuccessPageProps['searchParams']) {
  const params = searchParams ? await searchParams : {};

  if (params?.session_id) {
    const submission = await getSubmissionByStripeSessionId(params.session_id);
    return submission?.final_output || null;
  }

  if (params?.submission) {
    const submission = await getSubmission(params.submission);
    return submission?.final_output || null;
  }

  return null;
}

export default async function SuccessPage({ searchParams }: SuccessPageProps) {
  const finalOutput = await getFinalOutputBackup(searchParams);

  return (
    <main className="success-page">
      <section className="success-card">
        <LodestarMark />
        <h1>Payment received</h1>
        <p>Your rewrite is being sent to your email.</p>
        {finalOutput && (
          <div className="backup-output">
            <h2>Backup copy</h2>
            <pre>{formatFinalRewriteText(finalOutput)}</pre>
          </div>
        )}
        <Link className="primary-link" href="/">Back home</Link>
      </section>
    </main>
  );
}
