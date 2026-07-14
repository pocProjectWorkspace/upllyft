/**
 * Who is this child's parent, and how do we reach them?
 *
 * There are two kinds of child on this platform and they carry their parent's
 * identity in different places:
 *
 *   B2C   — the parent signed up, then added their child. Their real identity is on
 *           the `User` behind `Child.profile`. There may be no `Guardian` row at all.
 *
 *   FACILITY-CREATED — a nursery enrolment or a clinic walk-in. The child hangs off a
 *           SYNTHETIC shadow profile (`walkin.<uuid>@ancc.internal`) that exists only
 *           to satisfy the required `Child.profileId` FK. The parent's REAL name,
 *           email and phone live on the `Guardian` row, because putting their real
 *           address on a `User` is what created the account they could neither log
 *           into nor register for.
 *
 * So a screen that reads `child.profile.user.email` gets the truth for the first kind
 * and a synthetic placeholder for the second — showing clinic staff
 * `walkin.9f3c…@ancc.internal` where the family's address should be. Prefer the
 * guardian record where one exists, and fall back to the profile user.
 *
 * `onPlatform` is the useful signal for staff: false means this parent has not yet
 * claimed the child and cannot see anything. That is who you chase.
 */

const SYNTHETIC_DOMAIN = '@ancc.internal';

export interface ParentContactSource {
  profile?: {
    user?: {
      id: string;
      name: string | null;
      email: string;
      phone?: string | null;
      image?: string | null;
    } | null;
  } | null;
  guardians?: {
    fullName: string;
    email: string | null;
    phone: string | null;
    userId: string | null;
    isPrimaryContact: boolean;
  }[];
}

export interface ParentContact {
  id: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  avatar: string | null;
  /** False => they have not claimed this child and can see nothing. Chase them. */
  onPlatform: boolean;
}

/** The Prisma `select` a caller needs for `resolveParentContact` to work. */
export const PARENT_CONTACT_SELECT = {
  profile: {
    select: {
      user: { select: { id: true, name: true, email: true, phone: true, image: true } },
    },
  },
  guardians: {
    select: {
      fullName: true,
      email: true,
      phone: true,
      userId: true,
      isPrimaryContact: true,
    },
  },
} as const;

export function isShadowAccount(email: string | null | undefined): boolean {
  return Boolean(email && email.endsWith(SYNTHETIC_DOMAIN));
}

export function resolveParentContact(child: ParentContactSource): ParentContact | null {
  const user = child.profile?.user ?? null;
  const guardians = child.guardians ?? [];
  const guardian = guardians.find(g => g.isPrimaryContact) ?? guardians[0] ?? null;

  const profileIsShadow = isShadowAccount(user?.email);

  // A shadow profile is not a person. Where one is standing in for the parent, the
  // guardian row is the ONLY real identity we hold.
  if (guardian && (profileIsShadow || !user)) {
    return {
      id: guardian.userId,
      name: guardian.fullName,
      email: guardian.email,
      phone: guardian.phone,
      avatar: null,
      onPlatform: guardian.userId !== null,
    };
  }

  if (!user) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone ?? null,
    avatar: user.image ?? null,
    onPlatform: true,
  };
}
