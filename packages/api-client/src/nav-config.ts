export const APP_URLS = {
  main: process.env.NODE_ENV === 'production' ? 'https://app.upllyft.com' : 'http://localhost:3000',
  community: process.env.NODE_ENV === 'production' ? 'https://community.upllyft.com' : 'http://localhost:3002',
  screening: process.env.NODE_ENV === 'production' ? 'https://screening.upllyft.com' : 'http://localhost:3003',
  booking: process.env.NODE_ENV === 'production' ? 'https://booking.upllyft.com' : 'http://localhost:3004',
  resources: process.env.NODE_ENV === 'production' ? 'https://resources.upllyft.com' : 'http://localhost:3005',
  cases: process.env.NODE_ENV === 'production' ? 'https://cases.upllyft.com' : 'http://localhost:3006',
  admin: process.env.NODE_ENV === 'production' ? 'https://admin.upllyft.com' : 'http://localhost:3007',
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

  const items: GlobalNavItem[] = [
    { label: 'Hub', app: 'main', href: APP_URLS.main },
  ];

  if (isProfessional || isAdmin) {
    items.push({ label: 'Cases', app: 'cases', href: APP_URLS.cases });
  }

  items.push(
    { label: 'Feed', app: 'community', href: APP_URLS.community },
    { label: 'Screening', app: 'screening', href: APP_URLS.screening },
    { label: 'Booking', app: 'booking', href: APP_URLS.booking },
    { label: 'Resources', app: 'resources', href: APP_URLS.resources },
  );

  if (isProfessional || isAdmin) {
    items.push({ label: 'Clinic', app: 'admin', href: APP_URLS.admin });
  }

  return items;
}
