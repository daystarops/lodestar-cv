import { NextResponse } from 'next/server';
import { listSubmissions } from '@/lib/supabaseRest';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const key = url.searchParams.get('key');

  if (process.env.ADMIN_KEY && key !== process.env.ADMIN_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const submissions = await listSubmissions();
    return NextResponse.json({ submissions });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not load orders' },
      { status: 500 }
    );
  }
}
