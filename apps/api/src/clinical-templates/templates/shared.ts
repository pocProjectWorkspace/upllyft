/**
 * Shared building blocks for the 18 clinical templates.
 *
 * Every source template ("UPLLYFT PRACTICE OS") opens with the same client
 * identifier / metadata section (section A) and closes with the same
 * "Sign-off and audit trail" section. These helpers encode those once so each
 * discipline file only declares its discipline-specific middle sections.
 */
import type {
  ClinicalField,
  ClinicalSection,
} from '../clinical-types';

export const GENDER_OPTIONS = ['Male', 'Female', 'Other', 'Prefer not to say'];
export const REFERRAL_SOURCE_OPTIONS = [
  'Parent',
  'School',
  'Clinician',
  'Medical',
  'Self',
];
export const AUTHOR_ROLE_OPTIONS = [
  'Therapist',
  'Psychologist',
  'Special Educator',
  'Physician',
];
export const LOCATION_OPTIONS = ['Clinic', 'School', 'Home', 'Online'];
export const CONSENT_SCOPES = [
  'Assessment',
  'Therapy',
  'Data sharing',
  'Photo / video / audio',
  'AI-assisted drafting',
];

/**
 * Section A — client identifiers / metadata. Present on every template; the
 * base fields pre-populate from the child profile + intake + logged-in user.
 *
 * @param titleLetter  e.g. "A. Report identifiers" or "A. Session metadata"
 * @param extraFields  activity-specific header fields (Assessment type, Service
 *                     type, Review type, …) appended after the base identifiers.
 */
export function identifierSection(
  title: string,
  extraFields: ClinicalField[] = [],
): ClinicalSection {
  const base: ClinicalField[] = [
    {
      id: 'clientFullName',
      label: 'Client full name',
      type: 'text',
      required: true,
      prefillKey: 'clientFullName',
    },
    {
      id: 'clientMrn',
      label: 'Client ID / MRN',
      type: 'text',
      readOnly: true,
      prefillKey: 'clientMrn',
      guidance: 'Auto-generated',
    },
    {
      id: 'dateOfBirth',
      label: 'Date of birth',
      type: 'date',
      prefillKey: 'dateOfBirth',
    },
    {
      id: 'age',
      label: 'Age',
      type: 'text',
      readOnly: true,
      prefillKey: 'age',
      guidance: 'Calculated from DOB',
    },
    {
      id: 'gender',
      label: 'Gender',
      type: 'select',
      options: GENDER_OPTIONS,
      prefillKey: 'gender',
    },
    {
      id: 'parentCaregiver',
      label: 'Parent / caregiver',
      type: 'text',
      prefillKey: 'parentCaregiver',
      guidance: 'Name, relationship, phone, email',
    },
    {
      id: 'primaryLanguages',
      label: 'Primary language(s)',
      type: 'text',
      prefillKey: 'primaryLanguages',
      guidance: 'Home language, assessment language, interpreter used',
    },
    {
      id: 'schoolOrganisation',
      label: 'School / organisation',
      type: 'text',
      prefillKey: 'schoolOrganisation',
    },
    {
      id: 'referralSource',
      label: 'Referral source and reason',
      type: 'select',
      options: REFERRAL_SOURCE_OPTIONS,
      prefillKey: 'referralSource',
    },
    {
      id: 'consentStatus',
      label: 'Consent status',
      type: 'consent',
      consentScopes: CONSENT_SCOPES,
      prefillKey: 'consentStatus',
    },
    {
      id: 'recordAuthor',
      label: 'Record author',
      type: 'text',
      readOnly: true,
      prefillKey: 'recordAuthor',
      guidance: 'Logged-in professional',
    },
    {
      id: 'authorRole',
      label: 'Author role',
      type: 'select',
      options: AUTHOR_ROLE_OPTIONS,
      prefillKey: 'authorRole',
    },
    {
      id: 'encounterDateTime',
      label: 'Date & time',
      type: 'datetime',
      prefillKey: 'dateTimeLocation',
    },
    {
      id: 'location',
      label: 'Location',
      type: 'select',
      options: LOCATION_OPTIONS,
    },
  ];

  return {
    id: 'identifiers',
    title,
    fields: [...base, ...extraFields],
  };
}

/**
 * Final section — "Sign-off and audit trail". Identical on every template.
 */
export function signOffSection(): ClinicalSection {
  return {
    id: 'signoff',
    title: 'Sign-off and audit trail',
    fields: [
      {
        id: 'clinicianName',
        label: 'Clinician / professional name',
        type: 'text',
        prefillKey: 'recordAuthor',
        guidance: 'Name, designation, registration / licence ID',
      },
      {
        id: 'professionalDeclaration',
        label:
          'I confirm this note / report is accurate and has been reviewed by me.',
        type: 'checkbox',
        required: true,
      },
      {
        id: 'signature',
        label: 'Signature and date',
        type: 'signature',
      },
      {
        id: 'parentAcknowledgement',
        label: 'Parent / caregiver acknowledgement',
        type: 'signature',
        guidance: 'Optional — name, relationship, date/time',
      },
    ],
  };
}
