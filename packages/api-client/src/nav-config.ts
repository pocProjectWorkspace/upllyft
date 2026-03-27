const isProd = process.env.NODE_ENV === 'production';

export const APP_URLS = {
  main: process.env.NEXT_PUBLIC_APP_MAIN_URL || (isProd ? 'https://upllyft-web-main.vercel.app' : 'http://localhost:3000'),
  community: process.env.NEXT_PUBLIC_APP_COMMUNITY_URL || (isProd ? 'https://upllyft-web-community.vercel.app' : 'http://localhost:3002'),
  screening: process.env.NEXT_PUBLIC_APP_SCREENING_URL || (isProd ? 'https://upllyft-web-screening.vercel.app' : 'http://localhost:3003'),
  booking: process.env.NEXT_PUBLIC_APP_BOOKING_URL || (isProd ? 'https://upllyft-web-booking.vercel.app' : 'http://localhost:3004'),
  resources: process.env.NEXT_PUBLIC_APP_RESOURCES_URL || (isProd ? 'https://upllyft-web-resources.vercel.app' : 'http://localhost:3005'),
  cases: process.env.NEXT_PUBLIC_APP_CASES_URL || (isProd ? 'https://upllyft-web-cases.vercel.app' : 'http://localhost:3006'),
  admin: process.env.NEXT_PUBLIC_APP_ADMIN_URL || (isProd ? 'https://upllyft-web-admin.vercel.app' : 'http://localhost:3007'),
} as const;

export type AppName = keyof typeof APP_URLS;

export interface GlobalNavItem {
  label: string;
  app: AppName;
  href: string;
}

export function getNavItems(role: string): GlobalNavItem[] {
  const isProfessional = role === 'THERAPIST' || role === 'EDUCATOR';
  const isAdmin = role === 'ADMIN';
  const isSuperAdmin = role === 'SUPERADMIN';

  const items: GlobalNavItem[] = [
    { label: 'Hub', app: 'main', href: APP_URLS.main },
  ];

  if (isProfessional || isAdmin || isSuperAdmin) {
    items.push({ label: 'Cases', app: 'cases', href: APP_URLS.cases });
  }

  items.push(
    { label: 'Feed', app: 'community', href: APP_URLS.community },
    { label: 'Screening', app: 'screening', href: APP_URLS.screening },
    { label: 'Booking', app: 'booking', href: APP_URLS.booking },
    { label: 'Resources', app: 'resources', href: APP_URLS.resources },
  );

  if (isSuperAdmin) {
    items.push(
      { label: 'Admin', app: 'main', href: `${APP_URLS.main}/admin` },
      { label: 'Clinic', app: 'main', href: `${APP_URLS.main}/admin/clinics` }
    );
  } else if (isProfessional || isAdmin) {
    items.push({ label: 'Clinic', app: 'admin', href: APP_URLS.admin });
  }

  return items;
}
