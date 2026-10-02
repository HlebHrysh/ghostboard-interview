import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/serverDb';
import { sendRetentionEmail } from '@/lib/mail';

// This is required for Next.js to not cache this cron endpoint
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // 1. Verify Authorization — CRON_SECRET is mandatory
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      console.error('[Cron] CRON_SECRET env var is not set — cron endpoint locked down');
      return NextResponse.json({ error: 'Cron not configured' }, { status: 503 });
    }
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }


    // 2. Find users who haven't trained in exactly 3 days
    // We look for users whose latest session is between 72 and 96 hours ago
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const fourDaysAgo = new Date();
    fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);

    // This is a naive query for demo purposes. 
    // In production with large datasets, you would want a more optimized query or a 'lastActiveAt' field in User.
    const usersToEmail = await prisma.user.findMany({
      where: {
        history: {
          some: {
            // They have a history entry in the 3-4 days window...
            timestamp: {
              gte: fourDaysAgo.getTime(),
              lt: threeDaysAgo.getTime(),
            }
          },
          none: {
            // ...but NO history entries more recent than 3 days ago
            timestamp: {
              gte: threeDaysAgo.getTime(),
            }
          }
        }
      },
      select: {
        id: true,
        email: true,
        name: true,
      }
    });

    // 3. Send emails
    let sentCount = 0;
    for (const user of usersToEmail) {
      if (user.email) {
        const result = await sendRetentionEmail(user.email, user.name || 'Кандидат');
        if (result.success) {
          sentCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed retention cron job. Sent ${sentCount} emails out of ${usersToEmail.length} candidates.`,
    });
  } catch (error: any) {
    console.error('Retention Cron Error:', error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
