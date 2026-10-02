import { NextRequest, NextResponse } from 'next/server';
import { getAllPayments } from '@/lib/serverDb';
import { requireAdmin } from '@/lib/adminGuard';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;


  const payments = await getAllPayments();
  return NextResponse.json(payments);
}
