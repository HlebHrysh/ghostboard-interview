'use client';

import dynamic from 'next/dynamic';

const DeveloperDock = dynamic(
  () => import('@/components/dev/DeveloperDock').then((mod) => mod.DeveloperDock),
  { ssr: false }
);

export interface DeveloperDockLoaderProps {
  initialRole?: string | null;
  initialEffectivePlan?: string | null;
}

export function DeveloperDockLoader({
  initialRole,
  initialEffectivePlan,
}: DeveloperDockLoaderProps) {
  return (
    <DeveloperDock
      initialRole={initialRole}
      initialEffectivePlan={initialEffectivePlan}
    />
  );
}
