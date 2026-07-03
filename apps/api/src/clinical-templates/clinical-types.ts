/**
 * Clinical Template Engine — shared schema contract.
 *
 * A ClinicalTemplate is the digital equivalent of a paper clinic form (session
 * note, assessment report, MDT review, discharge summary, …). Its `schema` is a
 * list of sections, each a list of fields. The same contract is used by the API
 * (to store/seed templates) and by web-cases (to render a dynamic form and to
 * capture answers). Answers are stored as `ClinicalAnswers` keyed by field id.
 *
 * Source: the 18 "UPLLYFT PRACTICE OS" build templates in /public/forms.
 */

// ─── Taxonomy ────────────────────────────────────────────────────────────────

/** Therapy discipline (the "what type of therapy" axis of the picker). */
export type TherapyDiscipline =
  | 'SPEECH'
  | 'OCCUPATIONAL'
  | 'BEHAVIOUR_ABA'
  | 'PSYCHOLOGY'
  | 'SPECIAL_EDUCATION'
  | 'PHYSIOTHERAPY'
  | 'MEDICAL'
  | 'MULTIDISCIPLINARY'
  | 'UNIVERSAL';

/** Activity type (the "what template" axis of the picker). */
export type ClinicalActivityType =
  | 'INTAKE'
  | 'SESSION_NOTE'
  | 'ASSESSMENT'
  | 'CONSULTATION'
  | 'MDT_REVIEW'
  | 'GOAL_PLAN'
  | 'PROGRESS_REVIEW'
  | 'DISCHARGE';

export const THERAPY_DISCIPLINE_LABELS: Record<TherapyDiscipline, string> = {
  SPEECH: 'Speech & Language Therapy',
  OCCUPATIONAL: 'Occupational Therapy',
  BEHAVIOUR_ABA: 'Behaviour / ABA',
  PSYCHOLOGY: 'Psychology',
  SPECIAL_EDUCATION: 'Special Education',
  PHYSIOTHERAPY: 'Physiotherapy',
  MEDICAL: 'Developmental / Medical',
  MULTIDISCIPLINARY: 'Multidisciplinary (MDT)',
  UNIVERSAL: 'Universal / Any discipline',
};

export const CLINICAL_ACTIVITY_LABELS: Record<ClinicalActivityType, string> = {
  INTAKE: 'Intake & Case History',
  SESSION_NOTE: 'Session Note',
  ASSESSMENT: 'Assessment Report',
  CONSULTATION: 'Medical Consultation',
  MDT_REVIEW: 'MDT Review',
  GOAL_PLAN: 'Milestone & Goal Plan',
  PROGRESS_REVIEW: 'Progress Review',
  DISCHARGE: 'Discharge & Transition',
};

// ─── Field schema ────────────────────────────────────────────────────────────

/**
 * The control used to render/capture a field. Maps the "Platform control /
 * guidance" column of the source templates onto concrete UI widgets.
 */
export type ClinicalFieldType =
  | 'text' // single-line text
  | 'longtext' // multi-line textarea
  | 'select' // single-choice dropdown
  | 'multiselect' // multi-choice dropdown
  | 'checklist' // list of checkboxes (multiple)
  | 'checkbox' // single boolean checkbox
  | 'date'
  | 'daterange'
  | 'datetime'
  | 'number'
  | 'scale' // numeric rating scale (e.g. pain 0–10)
  | 'table' // repeatable rows of `columns`
  | 'smartgoal' // specialized repeatable goal table
  | 'signature' // e-signature (typed name + timestamp)
  | 'consent' // consent object (scope checkboxes)
  | 'attachment' // file upload reference(s)
  | 'heading'; // static section sub-heading / guidance, no input

/** A column definition inside a `table` / `smartgoal` field. */
export interface ClinicalTableColumn {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'select' | 'date';
  options?: string[];
}

export interface ClinicalField {
  /** Stable id — the key used in the answers object. */
  id: string;
  label: string;
  type: ClinicalFieldType;
  /** Guidance shown as helper text (from the template "guidance" column). */
  guidance?: string;
  placeholder?: string;
  required?: boolean;
  /** Options for select / multiselect / checklist. */
  options?: string[];
  /** Columns for table / smartgoal. */
  columns?: ClinicalTableColumn[];
  /**
   * If set, this field is pre-populated from the case/profile/intake using the
   * given key (see `ClinicalPrefill`). Pre-populated fields render editable
   * unless `readOnly` is also set.
   */
  prefillKey?: ClinicalPrefillKey;
  /** Render read-only (system value, e.g. MRN, calculated age). */
  readOnly?: boolean;
  /** Consent scopes for a `consent` field. */
  consentScopes?: string[];
}

export interface ClinicalSection {
  id: string;
  /** e.g. "A. Session metadata" */
  title: string;
  description?: string;
  fields: ClinicalField[];
}

export interface ClinicalTemplateSchema {
  sections: ClinicalSection[];
}

/** The full template record (mirrors the ClinicalTemplate Prisma model). */
export interface ClinicalTemplate {
  id?: string;
  /** Stable code, e.g. "SLP_ASSESSMENT". Unique. */
  code: string;
  name: string;
  description?: string;
  discipline: TherapyDiscipline;
  activityType: ClinicalActivityType;
  version: number;
  schema: ClinicalTemplateSchema;
  isGlobal?: boolean;
  organizationId?: string | null;
  isActive?: boolean;
}

/** Captured field values, keyed by `ClinicalField.id`. */
export type ClinicalAnswers = Record<string, unknown>;

// ─── Pre-population (profile + intake → header fields) ───────────────────────

/**
 * Keys that can be auto-filled into a template's header/identifier section from
 * the child profile, intake form and logged-in clinician. Resolved server-side
 * by the clinical-records prefill endpoint.
 */
export type ClinicalPrefillKey =
  | 'clientFullName'
  | 'clientMrn'
  | 'dateOfBirth'
  | 'age'
  | 'gender'
  | 'parentCaregiver'
  | 'primaryLanguages'
  | 'schoolOrganisation'
  | 'referralSource'
  | 'consentStatus'
  | 'recordAuthor'
  | 'authorRole'
  | 'dateTimeLocation'
  | 'diagnosis'
  | 'curriculumGrade'
  | 'nationality';

export type ClinicalPrefill = Partial<Record<ClinicalPrefillKey, unknown>>;

// ─── Catalog matrix (discipline × activity → template code) ──────────────────

export interface ClinicalCatalogEntry {
  code: string;
  name: string;
  discipline: TherapyDiscipline;
  activityType: ClinicalActivityType;
}
