const isProd = process.env.NODE_ENV === 'production';

export const APP_URLS = {
  main: process.env.NEXT_PUBLIC_APP_MAIN_URL || (isProd ? 'https://app.safehaven-upllyft.com' : 'http://localhost:3000'),
  community: process.env.NEXT_PUBLIC_APP_COMMUNITY_URL || (isProd ? 'https://community.safehaven-upllyft.com' : 'http://localhost:3002'),
  screening: process.env.NEXT_PUBLIC_APP_SCREENING_URL || (isProd ? 'https://screening.safehaven-upllyft.com' : 'http://localhost:3003'),
  booking: process.env.NEXT_PUBLIC_APP_BOOKING_URL || (isProd ? 'https://booking.safehaven-upllyft.com' : 'http://localhost:3004'),
  resources: process.env.NEXT_PUBLIC_APP_RESOURCES_URL || (isProd ? 'https://resources.safehaven-upllyft.com' : 'http://localhost:3005'),
  cases: process.env.NEXT_PUBLIC_APP_CASES_URL || (isProd ? 'https://cases.safehaven-upllyft.com' : 'http://localhost:3006'),
  admin: process.env.NEXT_PUBLIC_APP_ADMIN_URL || (isProd ? 'https://admin.safehaven-upllyft.com' : 'http://localhost:3007'),
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
  // OneVoice SSO users get a trimmed navigation: only Feed (community) and
  // Screening are exposed. Hub, Booking, Resources, Cases, Admin and Clinic
  // are hidden so the partner experience stays focused on the two modules
  // OneVoice has integrated with.
  if (ssoSource === 'onevoice') {
    return [
      { label: 'Feed', app: 'community', href: APP_URLS.community },
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
        { label: 'Mira has noticed', href: `${M}/moments/insights` },
        { label: 'Progress', href: `${M}/moments/progress` },
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
        { label: 'Find Care', href: `${B}/find-care` },
        { label: 'Browse', href: `${B}/discovery` },
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

  const resourcesChildren: GlobalNavChild[] = [
    { label: 'My Library', href: R },
    { label: 'Create', href: `${R}/create` },
    { label: 'Community', href: `${R}/community` },
    ...(isParent
      ? [
          { label: 'My Homework', href: `${R}/assignments` },
          { label: 'Progress', href: `${R}/progress` },
        ]
      : isProfessional
        ? [
            { label: 'Sent Assignments', href: `${R}/assignments` },
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
    { label: 'Feed', app: 'community', href: APP_URLS.community },
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
