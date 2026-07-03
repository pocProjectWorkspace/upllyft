import type {
  ClinicalTemplateSchema,
  ClinicalAnswers,
  ClinicalPrefill,
} from '@upllyft/types';

/**
 * Seed an answers object from a template schema + prefill values. Any field
 * carrying a `prefillKey` is populated from the resolved profile/intake data.
 */
export function buildInitialAnswers(
  schema: ClinicalTemplateSchema,
  prefill?: ClinicalPrefill | null,
): ClinicalAnswers {
  const answers: ClinicalAnswers = {};
  if (!schema?.sections) return answers;
  for (const section of schema.sections) {
    for (const field of section.fields ?? []) {
      if (field.prefillKey && prefill && prefill[field.prefillKey] != null) {
        answers[field.id] = prefill[field.prefillKey];
      }
    }
  }
  return answers;
}
