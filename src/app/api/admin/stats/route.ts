import { NextRequest, NextResponse } from 'next/server';
import { getAllUsers, getAllSessions, getAllPayments } from '@/lib/serverDb';
import { requireAdmin } from '@/lib/adminGuard';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  const users = await getAllUsers();
  const sessions = await getAllSessions();
  const payments = await getAllPayments();

  const totalUsers = users.length;
  const proUsers = users.filter((u) => u.plan === 'pro').length;
  const lifetimeUsers = users.filter((u) => u.plan === 'lifetime').length;
  const totalSessions = sessions.length;

  const totalRevenueCents = payments.reduce((sum, p) => sum + (p.amountCents || 0), 0);

  // MRR estimation: Pro subscriptions ($15-$25/mo)
  const proPayments = payments.filter((p) => p.plan && p.plan.includes('pro'));
  const mrrCents = proPayments.length > 0
    ? Math.round(proPayments.reduce((s, p) => s + (p.amountCents || 1500), 0) / proPayments.length) * proUsers
    : proUsers * 1500;

  // Paid users conversion rate
  const paidUsers = proUsers + lifetimeUsers;
  const conversionRate = totalUsers > 0 ? Number(((paidUsers / totalUsers) * 100).toFixed(1)) : 0;

  // Aggregated session statistics
  const totalQuestionsCount = sessions.reduce((sum, s) => sum + (s.questionsCount || 0), 0);
  const totalDurationSec = sessions.reduce((sum, s) => sum + (s.durationSec || 0), 0);
  const avgDurationSec = totalSessions > 0 ? Math.round(totalDurationSec / totalSessions) : 0;

  // Group users by plan for chart
  const plans = {
    free: users.filter((u) => u.plan === 'free').length,
    pro: proUsers,
    lifetime: lifetimeUsers,
  };

  // Group sessions by day for last 7 days + day labels
  const now = Date.now();
  const weekSessions = [0, 0, 0, 0, 0, 0, 0];
  const weekLabels: string[] = [];
  const ONE_DAY = 24 * 60 * 60 * 1000;

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now - i * ONE_DAY);
    weekLabels.push(d.toLocaleDateString('uk-UA', { weekday: 'short', day: 'numeric' }));
  }

  sessions.forEach((s) => {
    const diff = now - s.timestamp;
    const daysAgo = Math.floor(diff / ONE_DAY);
    if (daysAgo >= 0 && daysAgo < 7) {
      weekSessions[6 - daysAgo]++;
    }
  });

  // Unified recent activity feed (latest 10 items)
  const usersMap = new Map(users.map((u) => [u.id, u]));
  const activities: Array<{
    id: string;
    type: 'user' | 'session' | 'payment';
    title: string;
    subtitle: string;
    timestamp: number;
    badge?: string;
    amountCents?: number;
  }> = [];

  // Recent users
  users.slice(0, 5).forEach((u) => {
    activities.push({
      id: `act_u_${u.id}`,
      type: 'user',
      title: u.name || u.email.split('@')[0],
      subtitle: `Зареєструвався кандидат (${u.email})`,
      timestamp: u.createdAt ? new Date(u.createdAt).getTime() : now,
      badge: u.plan.toUpperCase(),
    });
  });

  // Recent sessions
  sessions.slice(0, 5).forEach((s) => {
    const user = usersMap.get(s.userId);
    activities.push({
      id: `act_s_${s.id}`,
      type: 'session',
      title: s.title || 'Співбесіда',
      subtitle: `${user?.email || 'Кандидат'} • ${Math.round(s.durationSec / 60)} хв • ${s.questionsCount || 0} пит.`,
      timestamp: s.timestamp,
      badge: s.isPublic ? 'PUBLIC' : 'PRIVATE',
    });
  });

  // Recent payments
  payments.slice(0, 5).forEach((p) => {
    activities.push({
      id: `act_p_${p.id}`,
      type: 'payment',
      title: `Оплата тарифу ${p.plan.toUpperCase()}`,
      subtitle: `${p.email} • $${(p.amountCents / 100).toFixed(2)}`,
      timestamp: p.timestamp,
      badge: p.status.toUpperCase(),
      amountCents: p.amountCents,
    });
  });

  // Sort unified activities desc
  activities.sort((a, b) => b.timestamp - a.timestamp);
  const recentActivity = activities.slice(0, 8);

  return NextResponse.json({
    totalUsers,
    proUsers,
    lifetimeUsers,
    paidUsers,
    conversionRate,
    totalSessions,
    totalRevenueCents,
    mrrCents,
    totalQuestionsCount,
    totalDurationSec,
    avgDurationSec,
    plans,
    weekSessions,
    weekLabels,
    recentActivity,
  });
}

