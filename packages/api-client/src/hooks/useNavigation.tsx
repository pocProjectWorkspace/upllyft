'use client';

import {
  createContext,
  useContext,
  useMemo,
  type AnchorHTMLAttributes,
  type ComponentType,
  type ReactNode,
} from 'react';

/**
 * Framework-agnostic navigation injection.
 *
 * `@upllyft/ui` and `@upllyft/api-client` cannot import `next/link` or
 * `next/navigation` directly (they are raw-TS workspace packages consumed by
 * several apps), so each app's root `providers.tsx` hands its `Link`
 * component and router `push` in here. Shared components (AppHeader,
 * NotificationBell, cards) then render real client-side transitions instead
 * of plain `<a href>` full-document reloads.
 *
 * Absolute same-origin URLs (e.g. `APP_URLS.main + '/feed'` while on the main
 * app) are handled by Next's `Link`, which performs a soft navigation for any
 * same-origin URL and a normal browser navigation for cross-origin ones.
 */
export type LinkLikeProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  prefetch?: boolean;
  children?: ReactNode;
};
export type LinkComponent = ComponentType<LinkLikeProps>;

const DefaultLink: LinkComponent = ({ href, children, prefetch: _prefetch, ...rest }) => (
  <a href={href} {...rest}>
    {children}
  </a>
);

function hardNavigate(href: string) {
  if (typeof window !== 'undefined') window.location.href = href;
}

/** Convert an absolute same-origin URL into a path; leave everything else untouched. Client-only. */
export function toLocalHref(href: string): string {
  if (typeof window === 'undefined') return href;
  try {
    const url = new URL(href, window.location.origin);
    if (url.origin === window.location.origin) return url.pathname + url.search + url.hash;
  } catch {
    /* not a URL */
  }
  return href;
}

export interface NavigationContextValue {
  /** Link component to render for in-app and cross-app links. */
  Link: LinkComponent;
  /** Programmatic navigation: soft for same-origin targets, hard for cross-origin. */
  go: (href: string) => void;
}

const NavigationContext = createContext<NavigationContextValue>({
  Link: DefaultLink,
  go: hardNavigate,
});

export interface NavigationProviderProps {
  children: ReactNode;
  linkComponent: LinkComponent;
  /** Router push, e.g. `useRouter().push` from `next/navigation`. */
  navigate: (href: string) => void;
}

export function NavigationProvider({ children, linkComponent, navigate }: NavigationProviderProps) {
  const value = useMemo<NavigationContextValue>(
    () => ({
      Link: linkComponent,
      go: (href: string) => {
        const local = toLocalHref(href);
        const isCrossOrigin = local === href && /^https?:\/\//i.test(href);
        if (isCrossOrigin) hardNavigate(href);
        else navigate(local);
      },
    }),
    [linkComponent, navigate],
  );
  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}

export function useNavigation(): NavigationContextValue {
  return useContext(NavigationContext);
}
