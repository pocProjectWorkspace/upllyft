/**
 * Speech & Language Therapy templates.
 *   03 — Speech & Language Assessment Report
 *   04 — Speech & Language Session Note
 */
import type { ClinicalTemplate } from '../clinical-types';
import { identifierSection, signOffSection } from './shared';

export const SPEECH_ASSESSMENT: ClinicalTemplate = {
  code: 'SLP_ASSESSMENT',
  name: 'Speech & Language Assessment Report',
  description: 'Assessment, review and report structure for SLP/SALT users.',
  discipline: 'SPEECH',
  activityType: 'ASSESSMENT',
  version: 1,
  schema: {
    sections: [
      identifierSection('A. Report identifiers', [
        {
          id: 'assessmentType',
          label: 'Assessment type',
          type: 'select',
          options: [
            'Initial',
            'Review',
            'Re-assessment',
            'School observation',
            'Feeding screening',
          ],
        },
        {
          id: 'assessmentLanguages',
          label: 'Assessment language(s)',
          type: 'text',
          guidance: 'Language(s), interpreter, dialect, multilingual considerations',
        },
      ]),
      {
        id: 'caseHistory',
        title: 'B. Case history and sources of information',
        fields: [
          {
            id: 'reasonForReferral',
            label: 'Reason for referral',
            type: 'longtext',
            guidance: 'Primary communication concern and referral question',
          },
          {
            id: 'sourcesReviewed',
            label: 'Sources reviewed',
            type: 'checklist',
            options: [
              'Parent interview',
              'Teacher report',
              'Prior reports',
              'Medical records',
              'Work samples',
              'Videos',
            ],
          },
          {
            id: 'developmentalHistory',
            label: 'Developmental, medical and hearing/vision history',
            type: 'longtext',
            guidance:
              'Relevant milestones, diagnoses, hearing tests, ENT, seizures, feeding, medication',
          },
          {
            id: 'communicationEnvironment',
            label: 'Education and communication environment',
            type: 'longtext',
            guidance: 'School/curriculum, languages at home/school, peer interaction',
          },
          {
            id: 'previousTherapy',
            label: 'Previous therapy and response',
            type: 'table',
            columns: [
              { key: 'provider', label: 'Provider' },
              { key: 'dates', label: 'Dates' },
              { key: 'frequency', label: 'Frequency' },
              { key: 'targets', label: 'Targets' },
              { key: 'progress', label: 'Progress' },
            ],
          },
        ],
      },
      {
        id: 'methods',
        title: 'C. Assessment methods and observations',
        fields: [
          {
            id: 'toolsUsed',
            label: 'Assessment tools used',
            type: 'longtext',
            guidance:
              'Standardized test / informal assessment / language sample / dynamic assessment / observation',
          },
          {
            id: 'behaviourDuringAssessment',
            label: 'Behaviour during assessment',
            type: 'longtext',
            guidance: 'Attention, cooperation, play, transitions, fatigue, sensory factors',
          },
          {
            id: 'oralMotor',
            label: 'Oral peripheral / oral-motor observations',
            type: 'longtext',
            guidance: 'Structure/function, drooling, feeding concerns, referral if needed',
          },
          {
            id: 'prelinguistic',
            label: 'Pre-linguistic and play skills',
            type: 'longtext',
            guidance: 'Joint attention, imitation, turn-taking, symbolic play',
          },
        ],
      },
      {
        id: 'domains',
        title: 'D. Communication domains',
        fields: [
          {
            id: 'receptiveLanguage',
            label: 'Receptive language',
            type: 'longtext',
            guidance: 'Understanding vocabulary, concepts, instructions, WH questions, narratives',
          },
          {
            id: 'expressiveLanguage',
            label: 'Expressive language',
            type: 'longtext',
            guidance: 'Words/phrases/sentences, grammar, vocabulary, narratives, MLU if used',
          },
          {
            id: 'speechSound',
            label: 'Speech sound / articulation / phonology',
            type: 'longtext',
            guidance: 'Intelligibility, error patterns, stimulability, oral motor relevance',
          },
          {
            id: 'pragmatic',
            label: 'Pragmatic / social communication',
            type: 'longtext',
            guidance: 'Eye gaze, initiation, reciprocity, topic maintenance, social use of language',
          },
          {
            id: 'fluency',
            label: 'Fluency',
            type: 'longtext',
            guidance: 'Stuttering behaviours, severity, impact, triggers',
          },
          {
            id: 'voiceResonance',
            label: 'Voice / resonance',
            type: 'longtext',
            guidance: 'Quality, pitch, loudness, nasality; refer when outside scope',
          },
          {
            id: 'aac',
            label: 'AAC / communication supports',
            type: 'longtext',
            guidance: 'Current supports, access method, symbols, gestures, device, recommendation',
          },
          {
            id: 'functionalImpact',
            label: 'Functional impact',
            type: 'longtext',
            guidance: 'Home, school, peer play, learning, safety, emotional impact',
          },
        ],
      },
      {
        id: 'summary',
        title: 'E. Summary, recommendations and goals',
        fields: [
          {
            id: 'clinicalImpression',
            label: 'Clinical impression / diagnosis where appropriate',
            type: 'longtext',
            guidance: 'Strengths, needs, severity, differential considerations, limitations',
          },
          {
            id: 'recommendations',
            label: 'Recommendations',
            type: 'longtext',
            guidance: 'Therapy frequency, parent coaching, school support, referrals',
          },
          {
            id: 'shortTermGoals',
            label: 'Short-term goals',
            type: 'smartgoal',
            columns: [
              { key: 'goal', label: 'Goal' },
              { key: 'baseline', label: 'Baseline' },
              { key: 'target', label: 'Target' },
              { key: 'cueing', label: 'Cueing' },
              { key: 'measure', label: 'Measurement method' },
              { key: 'timeframe', label: 'Timeframe' },
            ],
          },
          {
            id: 'longTermOutcomes',
            label: 'Long-term outcomes',
            type: 'smartgoal',
            columns: [
              { key: 'goal', label: 'Functional communication outcome' },
              { key: 'setting', label: 'Setting' },
              { key: 'timeframe', label: 'Timeframe' },
            ],
          },
          {
            id: 'homeSchoolProgramme',
            label: 'Home / school programme',
            type: 'longtext',
            guidance: 'Practical strategies and materials',
          },
          {
            id: 'reviewPlan',
            label: 'Review plan',
            type: 'longtext',
            guidance: 'Review timeline and progress measures',
          },
        ],
      },
      signOffSection(),
    ],
  },
};

export const SPEECH_SESSION_NOTE: ClinicalTemplate = {
  code: 'SLP_SESSION_NOTE',
  name: 'Speech & Language Session Note',
  description: 'Goal-linked note for therapy delivery and outcome tracking.',
  discipline: 'SPEECH',
  activityType: 'SESSION_NOTE',
  version: 1,
  schema: {
    sections: [
      identifierSection('A. Session metadata', [
        {
          id: 'sessionType',
          label: 'Session type',
          type: 'select',
          options: [
            'Individual',
            'Group',
            'Parent coaching',
            'School consult',
            'Teletherapy',
          ],
        },
        {
          id: 'communicationContext',
          label: 'Communication context',
          type: 'text',
          guidance: 'Language used, materials, setting, caregiver/teacher present',
        },
      ]),
      {
        id: 'goalData',
        title: 'B. Goal data',
        fields: [
          {
            id: 'goalAddressed',
            label: 'Goal addressed',
            type: 'text',
            guidance: 'Goal ID and description',
          },
          {
            id: 'target',
            label: 'Target',
            type: 'text',
            guidance:
              'Sound, word class, sentence structure, comprehension skill, pragmatic function, AAC target',
          },
          {
            id: 'activityMaterials',
            label: 'Activity / materials',
            type: 'text',
            guidance: 'Book, toy, worksheet, conversation, device, play routine',
          },
          {
            id: 'cueingLevel',
            label: 'Cueing / prompt level',
            type: 'select',
            options: [
              'Independent',
              'Visual',
              'Verbal',
              'Model',
              'Tactile',
              'Maximum support',
            ],
          },
          {
            id: 'trialsAccuracy',
            label: 'Trials and accuracy',
            type: 'table',
            columns: [
              { key: 'target', label: 'Target' },
              { key: 'trials', label: 'Trials', type: 'number' },
              { key: 'accuracy', label: 'Accuracy %', type: 'number' },
              { key: 'duration', label: 'Duration' },
            ],
          },
          {
            id: 'generalisation',
            label: 'Generalisation',
            type: 'text',
            guidance: 'Across person, setting, material, spontaneous use',
          },
          {
            id: 'parentStrategy',
            label: 'Parent strategy taught',
            type: 'text',
            guidance: 'Modelling, expansion, wait time, recast, AAC modelling',
          },
        ],
      },
      {
        id: 'soap',
        title: 'C. SOAP note',
        fields: [
          {
            id: 'subjective',
            label: 'Subjective',
            type: 'longtext',
            guidance: 'Parent/teacher report, child state, carryover',
          },
          {
            id: 'objective',
            label: 'Objective',
            type: 'longtext',
            guidance: 'Data and observations',
          },
          {
            id: 'assessment',
            label: 'Assessment',
            type: 'longtext',
            guidance: 'Progress, barriers, response to cues, clinical interpretation',
          },
          {
            id: 'plan',
            label: 'Plan',
            type: 'longtext',
            guidance: 'Next targets, home practice, review/referral',
          },
        ],
      },
      signOffSection(),
    ],
  },
};

export const SPEECH_TEMPLATES = [SPEECH_ASSESSMENT, SPEECH_SESSION_NOTE];
