'use client';

import { MomentsShell } from '@/components/moments/moments-shell';

export default function MomentsLayout({ children }: { children: React.ReactNode }) {
  return <MomentsShell>{children}</MomentsShell>;
}
