import Link from 'next/link';
import LodestarMark from '@/components/LodestarMark';

export default function SuccessPage() {
  return (
    <main className="success-page">
      <section className="success-card">
        <LodestarMark />
        <h1>Rewrite unlocked.</h1>
        <p>
          Your order was received. The next step is generating and delivering the tailored resume output.
        </p>
        <Link className="primary-link" href="/">Back home</Link>
      </section>
    </main>
  );
}
