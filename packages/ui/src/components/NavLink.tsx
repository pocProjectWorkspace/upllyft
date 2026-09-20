'use client';

import { useNavigation } from '@upllyft/api-client';
import type { AnchorHTMLAttributes, ReactNode } from 'react';

export type NavLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  children?: ReactNode;
};

/**
 * Anchor that renders the host app's client-side `Link` (injected via
 * `NavigationProvider`) so clicks inside the same app are soft navigations.
 * Falls back to a plain `<a>` when no provider is mounted.
 */
export function NavLink({ href, children, ...rest }: NavLinkProps) {
  const { Link } = useNavigation();
  return (
    <Link href={href} {...rest}>
      {children}
    </Link>
  );
}
