import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminGuard';
import { getAdminMetrics } from '@/lib/adminMetrics';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const range = searchParams.get('range') || '30d';
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const refresh = searchParams.get('refresh') === 'true';

    const metrics = await getAdminMetrics(range, startDate, endDate, refresh);

    return NextResponse.json(metrics, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error: unknown) {
    console.error('[Admin Metrics API Error]:', error);
    return NextResponse.json(
      { error: (error as { message?: string })?.message || 'Failed to fetch executive metrics' },
      { status: 500 }
    );
  }
}
