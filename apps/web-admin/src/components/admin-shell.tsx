'use client';

import type { ReactNode } from 'react';
import { RoleGuard } from './role-guard';

/**
 * Page-level wrapper. The header, sidebar and main container now live in the
 * root layout's AppFrame; this only enforces the role guard for the page.
 */
export function AdminShell({ children }: { children: ReactNode }) {
  return <RoleGuard>{children}</RoleGuard>;
}
