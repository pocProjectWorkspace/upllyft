/**
 * The seeded clinical template catalog — the 18 digitized "UPLLYFT PRACTICE OS"
 * templates, grouped by discipline. Consumed by the seed script and the
 * ClinicalTemplatesService to upsert global templates.
 */
import type { ClinicalTemplate } from '../clinical-types';
import { SPEECH_TEMPLATES } from './speech';
import { OT_TEMPLATES } from './ot';
import { BEHAVIOUR_TEMPLATES } from './behaviour';
import { PSYCHOLOGY_TEMPLATES } from './psychology';
import { SPECIAL_EDUCATION_TEMPLATES } from './special-education';
import { PHYSIO_TEMPLATES } from './physio';
import { MEDICAL_TEMPLATES } from './medical';
import { UNIVERSAL_TEMPLATES } from './universal';
import { REVIEW_TEMPLATES } from './reviews';

export const ALL_CLINICAL_TEMPLATES: ClinicalTemplate[] = [
  ...UNIVERSAL_TEMPLATES,
  ...SPEECH_TEMPLATES,
  ...OT_TEMPLATES,
  ...BEHAVIOUR_TEMPLATES,
  ...PSYCHOLOGY_TEMPLATES,
  ...SPECIAL_EDUCATION_TEMPLATES,
  ...PHYSIO_TEMPLATES,
  ...MEDICAL_TEMPLATES,
  ...REVIEW_TEMPLATES,
];
