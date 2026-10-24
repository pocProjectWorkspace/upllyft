import { createHash } from 'crypto';

/**
 * The platform's legal documents.
 *
 * The TEXT of Terms, Privacy and the agreements lives in `legal_document_versions` and is
 * edited by platform admins at /admin/legal (LegalDocumentsService). This file only says
 * which documents exist, what each acceptance checkbox says, and which ones every account
 * must accept.
 *
 * The `statement` is the exact wording of the checkbox; its hash (with type, edition and
 * the acceptance version) is stored with each acceptance so the wording can be proven.
 */
export type ManagedDocumentType = 'TERMS' | 'PRIVACY' | 'CLINIC_AGREEMENT' | 'THERAPIST_AGREEMENT';
export type LegalDocumentType = 'TERMS' | 'PRIVACY' | 'AGE_18_PLUS';

export const EDITIONS = ['GLOBAL', 'IN', 'AE'] as const;
export type Edition = (typeof EDITIONS)[number];

export interface ManagedDocumentDef {
  type: ManagedDocumentType;
  title: string;
  /** Public page with the current text. */
  url: string;
  /** URL-friendly name: /legal/<slug>. */
  slug: string;
  /** Every account accepts it (sign-up checkboxes and the in-app gate). */
  requiredForAll: boolean;
  /** Version of the built-in seed, used until an admin publishes one. */
  seedVersion?: string;
}

export const MANAGED_DOCUMENTS: readonly ManagedDocumentDef[] = [
  { type: 'TERMS', title: 'Terms of Service', url: '/terms-of-service', slug: 'terms', requiredForAll: true, seedVersion: '2026-10-19' },
  { type: 'PRIVACY', title: 'Privacy Policy', url: '/privacy-policy', slug: 'privacy', requiredForAll: true, seedVersion: '2026-10-19' },
  { type: 'CLINIC_AGREEMENT', title: 'Clinic & Organisation Agreement', url: '/legal/clinic-agreement', slug: 'clinic-agreement', requiredForAll: false },
  { type: 'THERAPIST_AGREEMENT', title: 'Therapist Professional Participation Agreement', url: '/legal/therapist-agreement', slug: 'therapist-agreement', requiredForAll: false },
];

export function managedDocument(typeOrSlug: string): ManagedDocumentDef | undefined {
  const k = typeOrSlug.toLowerCase();
  return MANAGED_DOCUMENTS.find((d) => d.slug === k || d.type.toLowerCase() === k);
}

/** What a user ticks. */
export const STATEMENTS: Record<LegalDocumentType, string> = {
  TERMS: 'I agree to the Upllyft Terms of Service.',
  PRIVACY: 'I have read the Upllyft Privacy Policy and understand how my information is used.',
  AGE_18_PLUS: 'I am 18 or older.',
};

/** The age confirmation is a statement, not a document; it is versioned here. */
export const AGE_18_PLUS_VERSION = '1';

/** One document as the sign-up form and the gate see it. */
export interface LegalDocument {
  type: LegalDocumentType;
  /** The acceptance version: changes only when users must accept again. */
  version: string;
  edition: string;
  title: string;
  statement: string;
  url: string | null;
  /** When the current text was published (it can change without a new acceptance). */
  lastUpdated?: string | null;
}

/** Hash of what was agreed to: type, edition, version and the exact checkbox wording. */
export function statementHash(doc: Pick<LegalDocument, 'type' | 'edition' | 'version' | 'statement'>): string {
  return createHash('sha256')
    .update(`${doc.type}\n${doc.edition}\n${doc.version}\n${doc.statement}`)
    .digest('hex');
}

export function contentHash(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}
