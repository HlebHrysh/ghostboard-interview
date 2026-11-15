import { NextRequest } from 'next/server';
import { POST as billingPortalPost } from '@/app/api/billing/portal/route';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  return billingPortalPost(req);
}
