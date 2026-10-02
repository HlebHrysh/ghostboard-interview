import { NextRequest, NextResponse } from 'next/server';
import { prisma, getSessionUser } from '@/lib/serverDb';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("ghostboard_session")?.value;
    const user = token ? await getSessionUser(token) : null;
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { historyId } = await req.json();

    if (!historyId) {
      return NextResponse.json({ error: 'History ID is required' }, { status: 400 });
    }

    if (process.env.DATABASE_URL) {
      try {
        const history = await prisma.history.findFirst({
          where: {
            id: historyId,
            userId: user.id
          }
        });

        if (!history) {
          return NextResponse.json({ error: 'History not found' }, { status: 404 });
        }

        if (history.isPublic && history.publicSlug) {
          return NextResponse.json({ slug: history.publicSlug });
        }

        const newSlug = crypto.randomBytes(8).toString('hex');
        
        await prisma.history.update({
          where: { id: history.id },
          data: {
            isPublic: true,
            publicSlug: newSlug,
          }
        });

        return NextResponse.json({ slug: newSlug });
      } catch (dbErr) {
        console.warn('Prisma error in share route, generating fallback slug:', dbErr);
      }
    }

    // Fallback slug for local offline testing
    const { getUserInterviewSessions, makeSessionPublic } = await import('@/lib/serverDb');
    const userSessions = await getUserInterviewSessions(user.id);
    const sessionToShare = userSessions.find(s => s.id === historyId);
    
    if (!sessionToShare) {
      return NextResponse.json({ error: 'History not found or access denied' }, { status: 404 });
    }

    if (sessionToShare.isPublic && sessionToShare.publicSlug) {
      return NextResponse.json({ slug: sessionToShare.publicSlug });
    }

    const fallbackSlug = crypto.randomBytes(8).toString('hex');
    await makeSessionPublic(historyId, fallbackSlug);
    return NextResponse.json({ slug: fallbackSlug });

  } catch (error) {
    console.error('Error generating share slug:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
