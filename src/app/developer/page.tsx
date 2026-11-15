import { redirect } from 'next/navigation';
import {
  getEffectiveEntitlements,
  getServerDeveloperUser,
} from '@/lib/devGuard';
import { DeveloperWorkbench } from '@/components/dev/DeveloperWorkbench';

export const dynamic = 'force-dynamic';

export default async function DeveloperWorkbenchPage() {
  const user = await getServerDeveloperUser();
  if (!user) {
    redirect('/');
  }

  const entitlements = getEffectiveEntitlements(user);

  return (
    <DeveloperWorkbench
      initialDeveloperEmail={user.email}
      initialDeveloperRole={user.role ?? 'developer'}
      initialEffectivePlan={entitlements.effectivePlan}
    />
  );
}
