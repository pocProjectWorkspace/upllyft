import { Prisma } from '@prisma/client';

/**
 * What a parent may see: the owner has made the clinic public AND an Upllyft admin
 * has approved it (backlog #2). Solo practices reach ACTIVE automatically when the
 * owner's licence is verified.
 */
export const PUBLIC_CLINIC_WHERE = {
  isPublic: true,
  complianceStatus: 'ACTIVE',
} as const satisfies Prisma.ClinicWhereInput;

/**
 * Who a parent may find and book. Search, the public profile and booking creation all
 * apply this one rule, so a therapist hidden from search cannot be booked by link.
 *
 *   - switched on (active, accepting bookings)
 *   - verified: their licence was checked by their clinic (credentialStatus) or Upllyft
 *     verified the account (verificationStatus)
 *   - actually bookable: at least one active session type and some weekly availability
 *   - a clinic therapist's clinic is itself listed (public + approved)
 *   - an org-linked therapist has at least one APPROVED link
 */
export const BOOKABLE_THERAPIST_WHERE: Prisma.TherapistProfileWhereInput = {
  isActive: true,
  acceptingBookings: true,
  sessionTypes: { some: { isActive: true } },
  availability: { some: { isActive: true } },
  AND: [
    {
      OR: [
        { credentialStatus: 'VERIFIED' },
        { user: { verificationStatus: 'VERIFIED' } },
      ],
    },
    { OR: [{ clinic: { is: null } }, { clinic: PUBLIC_CLINIC_WHERE }] },
    {
      OR: [
        { organizationLinks: { none: {} } },
        { organizationLinks: { some: { status: 'APPROVED' } } },
      ],
    },
  ],
};

/** Public view of the therapist's account: never the email address. */
export const PUBLIC_THERAPIST_USER_SELECT = {
  id: true,
  name: true,
  image: true,
} as const satisfies Prisma.UserSelect;

/**
 * Supported countries as ISO codes, with the spellings already stored for them (the
 * org Add-Therapist wizard writes "India" / "UAE"). Matching is case-insensitive.
 */
const COUNTRY_ALIASES: Record<string, string[]> = {
  IN: ['IN', 'India'],
  AE: ['AE', 'UAE', 'United Arab Emirates'],
  SA: ['SA', 'KSA', 'Saudi Arabia'],
};

export function normalizeCountry(value?: string | null): string | null {
  const v = value?.trim().toLowerCase();
  if (!v) return null;
  for (const [code, aliases] of Object.entries(COUNTRY_ALIASES)) {
    if (aliases.some((a) => a.toLowerCase() === v)) return code;
  }
  return null;
}

export function countryAliases(code: string): string[] {
  return COUNTRY_ALIASES[code] ?? [code];
}

/**
 * Markets where care runs through licensed clinics only — mirrors
 * `serviceModel: 'CLINIC_DIRECTORY'` in packages/types/src/region.ts. Independent
 * therapists are not listed there.
 */
export const CLINIC_DIRECTORY_COUNTRIES = new Set(['AE', 'SA']);

/** Where a therapist practises: their clinic's location, or their own when independent. */
export function therapistLocation(t: {
  country?: string | null;
  city?: string | null;
  clinic?: { country?: string | null; city?: string | null } | null;
}): { country: string | null; city: string | null } {
  if (t.clinic) {
    return { country: normalizeCountry(t.clinic.country), city: t.clinic.city?.trim() || null };
  }
  return { country: normalizeCountry(t.country), city: t.city?.trim() || null };
}

/** Modalities a parent can attend from another city. */
export const REMOTE_MODALITIES = ['TELEHEALTH', 'HYBRID'] as const;

/**
 * The therapist profile a parent may see. Deliberately a select, not an include: the
 * row also carries Emirates ID, phone, licence/insurance numbers and Stripe ids.
 */
export const PUBLIC_THERAPIST_SELECT = {
  id: true,
  userId: true,
  bio: true,
  credentials: true,
  specializations: true,
  yearsExperience: true,
  title: true,
  profileImage: true,
  languages: true,
  defaultTimezone: true,
  overallRating: true,
  totalSessions: true,
  totalRatings: true,
  isActive: true,
  acceptingBookings: true,
  department: true,
  licenseAuthority: true,
  credentialStatus: true,
  country: true,
  city: true,
  user: { select: PUBLIC_THERAPIST_USER_SELECT },
  clinic: { select: { id: true, name: true, logoUrl: true, country: true, city: true } },
  sessionTypes: {
    where: { isActive: true },
    select: { id: true, name: true, description: true, duration: true, defaultPrice: true, currency: true, modality: true },
  },
  sessionPricing: {
    where: { isActive: true },
    select: { sessionTypeId: true, price: true, currency: true },
  },
} as const satisfies Prisma.TherapistProfileSelect;

type PublicTherapistRow = Prisma.TherapistProfileGetPayload<{ select: typeof PUBLIC_THERAPIST_SELECT }>;

/**
 * Adds what a parent's card shows: where they practise, whether Upllyft lists them
 * independently or through a clinic, whether they see families online, and the lowest
 * active session price (therapist pricing overrides the session type's default).
 */
export function toPublicTherapist<T extends PublicTherapistRow>(t: T) {
  let startingPrice: number | null = null;
  let currency: string | null = null;
  for (const st of t.sessionTypes) {
    const custom = t.sessionPricing.find((p) => p.sessionTypeId === st.id);
    const price = custom?.price ?? st.defaultPrice;
    if (price > 0 && (startingPrice === null || price < startingPrice)) {
      startingPrice = price;
      currency = custom?.currency ?? st.currency;
    }
  }
  return {
    ...t,
    location: therapistLocation(t),
    source: t.clinic ? ('CLINIC' as const) : ('INDEPENDENT' as const),
    offersOnline: t.sessionTypes.some((st) => (REMOTE_MODALITIES as readonly string[]).includes(st.modality)),
    startingPrice,
    currency,
  };
}
