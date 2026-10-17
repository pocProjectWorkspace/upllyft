import { createHash } from 'crypto';

/**
 * The legal documents every account must accept, and their current versions.
 *
 * Bumping a `version` asks every user to accept again (the in-app gate shows it on
 * their next visit). The `statement` is the exact wording of the checkbox; its hash
 * is stored with each acceptance so the wording can be proven later.
 *
 * `version` tracks the "Last updated" date on the published page. When the
 * counsel-approved Legal Pack (India / UAE editions) is published, give each edition
 * its own entry and bump the versions.
 */
export type LegalDocumentType = 'TERMS' | 'PRIVACY' | 'AGE_18_PLUS';

export interface LegalDocument {
  type: LegalDocumentType;
  version: string;
  /** Edition the version belongs to; the published pages are one global edition for now. */
  edition: string;
  title: string;
  /** Checkbox wording shown to the user. */
  statement: string;
  /** Public page with the full text, when there is one. */
  url: string | null;
}

export const LEGAL_DOCUMENTS: readonly LegalDocument[] = [
  {
    type: 'TERMS',
    version: '2026-10-16',
    edition: 'GLOBAL',
    title: 'Terms of Service',
    statement: 'I agree to the Upllyft Terms of Service.',
    url: '/terms-of-service',
  },
  {
    type: 'PRIVACY',
    version: '2026-10-16',
    edition: 'GLOBAL',
    title: 'Privacy Policy',
    statement: 'I have read the Upllyft Privacy Policy and understand how my information is used.',
    url: '/privacy-policy',
  },
  {
    type: 'AGE_18_PLUS',
    version: '1',
    edition: 'GLOBAL',
    title: 'Age confirmation',
    statement: 'I am 18 or older.',
    url: null,
  },
];

/** Hash of what was agreed to: type, edition, version and the exact checkbox wording. */
export function statementHash(doc: LegalDocument): string {
  return createHash('sha256')
    .update(`${doc.type}\n${doc.edition}\n${doc.version}\n${doc.statement}`)
    .digest('hex');
}
