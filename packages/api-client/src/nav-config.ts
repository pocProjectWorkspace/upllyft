const isProd = process.env.NODE_ENV === 'production';

const MAIN_URL = process.env.NEXT_PUBLIC_APP_MAIN_URL || (isProd ? 'https://app.safehaven-upllyft.com' : 'http://localhost:3000');

/**
 * Every product section is a path under the hub app (PERFORMANCE_AUDIT.md §7e):
 * community -> /community, screening -> /screening, booking -> /booking,
 * resources -> /resources, cases -> /cases, clinic admin -> /clinic.
 * The former standalone apps and their NEXT_PUBLIC_APP_*_URL / MERGED_APPS
 * switches are retired; old `*.safehaven-upllyft.com` hosts are redirected to
 * these prefixes by web-main's next.config.
 */
export const MERGED_PREFIX = {
  community: '/community',
  screening: '/screening',
  booking: '/booking',
  resources: '/resources',
  cases: '/cases',
  admin: '/clinic',
} as const;

export const APP_URLS = {
  main: MAIN_URL,
  community: `${MAIN_URL}${MERGED_PREFIX.community}`,
  screening: `${MAIN_URL}${MERGED_PREFIX.screening}`,
  booking: `${MAIN_URL}${MERGED_PREFIX.booking}`,
  resources: `${MAIN_URL}${MERGED_PREFIX.resources}`,
  cases: `${MAIN_URL}${MERGED_PREFIX.cases}`,
  admin: `${MAIN_URL}${MERGED_PREFIX.admin}`,
} as const;

export type AppName = keyof typeof APP_URLS;

export interface GlobalNavChild {
  label: string;
  href: string;
}

export interface GlobalNavItem {
  label: string;
  app: AppName;
  href: string;
  /**
   * Level-2 destinations inside this app. When present, the header renders the item as a
   * dropdown instead of a plain link — one nav row, no second-level strip. Hrefs are
   * absolute so the menu works from ANY app, not just the one the user is in.
   */
  children?: GlobalNavChild[];
}

export function getNavItems(
  role: string,
  ssoSource?: string | null,
): GlobalNavItem[] {
  // OneVoice SSO users get a trimmed navigation: only Community and
  // Screening are exposed. Hub, Booking, Resources, Cases, Admin and Clinic
  // are hidden so the partner experience stays focused on the two modules
  // OneVoice has integrated with.
  if (ssoSource === 'onevoice') {
    return [
      { label: 'Community', app: 'community', href: APP_URLS.community },
      { label: 'Screening', app: 'screening', href: APP_URLS.screening },
    ];
  }

  const isParent = role === 'USER';
  const isProfessional = role === 'THERAPIST' || role === 'EDUCATOR';
  const isAdmin = role === 'ADMIN';
  const isSuperAdmin = role === 'SUPERADMIN';

  const B = APP_URLS.booking;
  const R = APP_URLS.resources;
  const S = APP_URLS.screening;
  const M = APP_URLS.main;

  const items: GlobalNavItem[] = [
    { label: 'Hub', app: 'main', href: M },
  ];

  // Everyday Moments lives inside the main app (/moments) but is a distinct parent
  // destination. Parents (USER) only.
  if (isParent) {
    items.push({
      label: 'Moments',
      app: 'main',
      href: `${M}/moments`,
      children: [
        { label: 'Everyday Moments', href: `${M}/moments` },
        { label: 'Progress', href: `${M}/moments/progress` },
        { label: 'Mira has noticed', href: `${M}/moments/insights` },
      ],
    });
  }

  if (isProfessional || isAdmin || isSuperAdmin) {
    items.push({ label: 'Cases', app: 'cases', href: APP_URLS.cases });
  }

  // Nursery lives inside the Cases app (/nursery) but is a distinct destination, so it
  // gets its own tab. Shown to the roles that staff a nursery — an EDUCATOR (keyworker /
  // inclusion lead) or an ORGANIZATION admin. The nav is role-only (it can't know who is a
  // FacilityMember), so a clinical educator sees the tab too; the page's own empty state
  // ("No nursery yet — ask your platform admin") handles that gracefully. Access to any
  // actual nursery is still gated on FacilityMembership server-side.
  if (role === 'EDUCATOR' || role === 'ORGANIZATION') {
    items.push({ label: 'Nursery', app: 'cases', href: `${APP_URLS.cases}/nursery` });
  }

  // Level-2 menus mirror what each app's own shell used to render as a second nav row —
  // the source of truth for those destinations now lives here.
  const screeningChildren: GlobalNavChild[] = [
    { label: 'My Screenings', href: S },
    { label: 'Insights', href: `${S}/insights` },
    ...(isProfessional ? [{ label: 'Shared With Me', href: `${S}/shared` }] : []),
  ];

  const bookingChildren: GlobalNavChild[] = isParent
    ? [
        // One entry, not two: Find Care is the guided front door and hands off to the
        // discovery results itself; a separate "Browse" item duplicated it (backlog #3).
        { label: 'Find Care', href: `${B}/find-care` },
        { label: 'Saved', href: `${B}/saved` },
        { label: 'My Bookings', href: `${B}/bookings` },
        { label: 'Invoices', href: `${B}/invoices` },
      ]
    : isProfessional
      ? [
          { label: 'Dashboard', href: `${B}/therapist/dashboard` },
          { label: 'Bookings & Availability', href: `${B}/therapist/bookings` },
          { label: 'Earnings', href: `${B}/therapist/earnings` },
          { label: 'Pricing', href: `${B}/therapist/pricing` },
        ]
      : isAdmin || isSuperAdmin
        ? [
            { label: 'Find Therapists', href: B },
            { label: 'Settings', href: `${B}/admin/settings` },
            { label: 'Commissions', href: `${B}/admin/commissions` },
          ]
        : [];

  // Parents get the Resources journey (one child at a time: library · their library ·
  // progress), all on /resources. Everyone else keeps the worksheet tools.
  const resourcesChildren: GlobalNavChild[] = isParent
    ? [
        { label: 'Resource Library', href: R },
        { label: 'My Child’s Library', href: `${R}?tab=mine` },
        { label: 'Progress', href: `${R}?tab=progress` },
        { label: 'Community', href: `${R}/community` },
      ]
    : [
        { label: 'My Library', href: R },
        { label: 'Resource Library', href: `${R}/library` },
        { label: 'Create', href: `${R}/create` },
        { label: 'Community', href: `${R}/community` },
        ...(isProfessional
          ? [
              { label: 'Assignments', href: `${R}/assignments` },
              { label: 'Shared with me', href: `${R}/shared` },
              { label: 'Recommendations', href: `${R}/recommendations` },
            ]
          : isAdmin || isSuperAdmin
            ? [
                { label: 'Moderation', href: `${R}/moderation` },
                { label: 'Contributors', href: `${R}/contributors` },
              ]
            : []),
      ];

  items.push(
    { label: 'Community', app: 'community', href: APP_URLS.community },
    { label: 'Screening', app: 'screening', href: S, children: screeningChildren },
    // A parent's entry to booking is the adaptive Find Care screen, not the raw browse
    // grid — it reads what's known about the child and routes accordingly. Professionals
    // land on the marketplace as before.
    {
      label: 'Booking',
      app: 'booking',
      href: isParent ? `${B}/find-care` : B,
      ...(bookingChildren.length ? { children: bookingChildren } : {}),
    },
    { label: 'Resources', app: 'resources', href: R, children: resourcesChildren },
  );

  if (isSuperAdmin) {
    items.push(
      { label: 'Admin', app: 'main', href: `${M}/admin` },
      { label: 'Clinic', app: 'main', href: `${M}/admin/clinics` }
    );
  } else if (isProfessional || isAdmin) {
    items.push({ label: 'Clinic', app: 'admin', href: APP_URLS.admin });
  }

  return items;
}
