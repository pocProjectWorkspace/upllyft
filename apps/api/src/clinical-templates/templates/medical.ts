/**
 * Developmental / Medical templates.
 *   14 — Developmental / Medical Consultation Note Template
 */
import type { ClinicalTemplate } from '../clinical-types';
import { identifierSection, signOffSection } from './shared';

export const MEDICAL_CONSULTATION: ClinicalTemplate = {
  code: 'MEDICAL_CONSULTATION',
  name: 'Developmental / Medical Consultation Note Template',
  description:
    'Medical review and care coordination note for licensed medical professionals.',
  discipline: 'MEDICAL',
  activityType: 'CONSULTATION',
  version: 1,
  schema: {
    sections: [
      identifierSection('A. Consultation metadata', [
        {
          id: 'consultationType',
          label: 'Consultation type',
          type: 'select',
          options: [
            'Initial',
            'Follow-up',
            'Medication review',
            'Developmental review',
            'Referral review',
            'Emergency concern',
          ],
        },
      ]),
      {
        id: 'clinicalReview',
        title: 'B. Clinical review',
        fields: [
          {
            id: 'reasonForConsultation',
            label: 'Reason for consultation',
            type: 'text',
            guidance: 'Referral question and presenting concerns',
          },
          {
            id: 'historyOfPresentingConcern',
            label: 'History of presenting concern',
            type: 'text',
            guidance: 'Onset, duration, triggers, progression, functional impact',
          },
          {
            id: 'pastMedicalHistory',
            label: 'Past medical/developmental history',
            type: 'text',
            guidance:
              'Diagnoses, hospitalisation, surgeries, seizures, genetic/metabolic, allergies',
          },
          {
            id: 'medicationReview',
            label: 'Medication review',
            type: 'table',
            columns: [
              { key: 'medication', label: 'Medication' },
              { key: 'dose', label: 'Dose if recorded' },
              { key: 'adherence', label: 'Adherence' },
              { key: 'response', label: 'Response' },
              { key: 'adverseEffects', label: 'Adverse effects' },
            ],
          },
          {
            id: 'systemsReviewRedFlags',
            label: 'Systems review / red flags',
            type: 'checklist',
            options: [
              'Sleep',
              'Feeding',
              'GI',
              'Respiratory',
              'Neurological',
              'Pain',
              'Mental health',
              'Safeguarding',
            ],
          },
          {
            id: 'examinationObservations',
            label: 'Examination / observations',
            type: 'text',
            guidance:
              'Vitals where appropriate, general/developmental/neurological observations',
          },
          {
            id: 'assessmentImpression',
            label: 'Assessment / impression',
            type: 'text',
            guidance: 'Clinical impression, differential, risk level, limitations',
          },
          {
            id: 'plan',
            label: 'Plan',
            type: 'text',
            guidance:
              'Investigations, medication plan, referrals, therapy coordination, review date',
          },
          {
            id: 'safetyNetAdvice',
            label: 'Safety-net advice',
            type: 'text',
            guidance: 'When to seek urgent care; emergency contacts',
          },
        ],
      },
      signOffSection(),
    ],
  },
};

export const MEDICAL_TEMPLATES = [MEDICAL_CONSULTATION];
