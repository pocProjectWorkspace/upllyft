/**
 * Psychology templates.
 *   09 — Psychology Assessment Report
 *   10 — Psychology Session Note
 */
import type { ClinicalTemplate } from '../clinical-types';
import { identifierSection, signOffSection } from './shared';

export const PSYCH_ASSESSMENT: ClinicalTemplate = {
  code: 'PSYCH_ASSESSMENT',
  name: 'Psychology Assessment Report',
  description:
    'Child, adolescent and developmental psychology assessment structure.',
  discipline: 'PSYCHOLOGY',
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
            'Developmental',
            'Psychoeducational',
            'Cognitive',
            'Adaptive',
            'Behaviour',
            'Emotional',
            'Autism/ADHD screening',
            'Review',
          ],
        },
        {
          id: 'referralQuestion',
          label: 'Referral question',
          type: 'text',
          guidance: 'What question should this assessment answer?',
        },
      ]),
      {
        id: 'background',
        title: 'B. Consent, sources and background',
        fields: [
          {
            id: 'consentAssent',
            label: 'Consent and assent',
            type: 'checklist',
            options: [
              'Parent consent',
              'Child assent where applicable',
              'Confidentiality explained',
            ],
          },
          {
            id: 'sourcesOfInformation',
            label: 'Sources of information',
            type: 'checklist',
            options: [
              'Interview',
              'School report',
              'Rating scales',
              'Previous reports',
              'Observation',
              'Work samples',
            ],
          },
          {
            id: 'developmentalMedicalHistory',
            label: 'Developmental and medical history',
            type: 'longtext',
            guidance:
              'Milestones, diagnoses, medication, neurological history, sleep, sensory, trauma/context',
          },
          {
            id: 'familyPsychosocialContext',
            label: 'Family and psychosocial context',
            type: 'text',
            guidance: 'Family structure, stressors, supports, languages, culture',
          },
          {
            id: 'educationalHistory',
            label: 'Educational history',
            type: 'text',
            guidance:
              'Grade, curriculum, attendance, learning concerns, accommodations',
          },
        ],
      },
      {
        id: 'findings',
        title: 'C. Assessment findings',
        fields: [
          {
            id: 'behaviouralObservations',
            label: 'Behavioural observations / mental status',
            type: 'longtext',
            guidance:
              'Appearance, engagement, attention, mood, affect, speech, thought, insight, behaviour',
          },
          {
            id: 'toolsAdministered',
            label: 'Assessment tools administered',
            type: 'table',
            columns: [
              { key: 'tool', label: 'Tool' },
              { key: 'domain', label: 'Domain' },
              { key: 'date', label: 'Date', type: 'date' },
              { key: 'validity', label: 'Validity/limitations' },
            ],
          },
          {
            id: 'cognitiveProfile',
            label: 'Cognitive profile',
            type: 'longtext',
            guidance:
              'Verbal, nonverbal, working memory, processing speed where assessed',
          },
          {
            id: 'adaptiveFunctioning',
            label: 'Adaptive functioning',
            type: 'longtext',
            guidance:
              'Communication, daily living, socialisation, motor, independence',
          },
          {
            id: 'academicLearningProfile',
            label: 'Academic/learning profile',
            type: 'longtext',
            guidance:
              'Reading, writing, maths, executive skills, classroom functioning',
          },
          {
            id: 'socialEmotionalProfile',
            label: 'Social-emotional/behavioural profile',
            type: 'longtext',
            guidance:
              'Anxiety, mood, attention, hyperactivity, emotional regulation, social functioning',
          },
          {
            id: 'neurodevelopmentalScreening',
            label: 'Neurodevelopmental screening',
            type: 'text',
            guidance: 'Autism, ADHD, ID, SLD indicators; diagnostic limitations',
          },
          {
            id: 'riskSafeguarding',
            label: 'Risk/safeguarding',
            type: 'longtext',
            guidance:
              'Self-harm, harm to others, abuse/neglect, exploitation, urgent referral',
          },
        ],
      },
      {
        id: 'formulation',
        title: 'D. Formulation and recommendations',
        fields: [
          {
            id: 'integratedFormulation',
            label: 'Integrated formulation',
            type: 'longtext',
            guidance:
              'Biological, psychological, social, learning and environmental factors',
          },
          {
            id: 'diagnosticImpression',
            label: 'Diagnostic impression / opinion',
            type: 'text',
            guidance:
              'Where within scope; include limitations and differential considerations',
          },
          {
            id: 'strengthsProtectiveFactors',
            label: 'Strengths and protective factors',
            type: 'text',
            guidance: 'Abilities, interests, supports, motivation',
          },
          {
            id: 'recommendations',
            label: 'Recommendations',
            type: 'table',
            guidance:
              'Therapy, parent guidance, school accommodations, medical/psychiatry referral, OT/Speech/Behaviour referral',
            columns: [{ key: 'recommendation', label: 'Recommendation' }],
          },
          {
            id: 'goalsInterventionPlan',
            label: 'Goals / intervention plan',
            type: 'smartgoal',
            columns: [
              { key: 'priority', label: 'Priority' },
              { key: 'baseline', label: 'Baseline' },
              { key: 'intervention', label: 'Intervention' },
              { key: 'outcome', label: 'Expected outcome' },
              { key: 'reviewDate', label: 'Review date' },
            ],
          },
          {
            id: 'feedbackPlan',
            label: 'Feedback plan',
            type: 'text',
            guidance:
              'Parent feedback, child feedback, school meeting, report release',
          },
        ],
      },
      signOffSection(),
    ],
  },
};

export const PSYCH_SESSION_NOTE: ClinicalTemplate = {
  code: 'PSYCH_SESSION_NOTE',
  name: 'Psychology Session Note',
  description: 'Therapy, counselling, parent guidance and review note.',
  discipline: 'PSYCHOLOGY',
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
            'Parent session',
            'Family',
            'School consult',
            'Feedback',
            'Review',
          ],
        },
        {
          id: 'confidentialityStatus',
          label: 'Confidentiality status',
          type: 'select',
          options: [
            'General clinical record',
            'Restricted psychotherapy note',
            'Safeguarding note',
          ],
        },
      ]),
      {
        id: 'clinicalNote',
        title: 'B. Clinical note',
        fields: [
          {
            id: 'presentingIssue',
            label: 'Presenting issue / update',
            type: 'text',
            guidance:
              'Current concern, events since last session, parent/child report',
          },
          {
            id: 'mentalStatusEngagement',
            label: 'Mental status / engagement',
            type: 'text',
            guidance:
              'Mood, affect, attention, behaviour, speech, thought, risk indicators',
          },
          {
            id: 'interventionUsed',
            label: 'Intervention used',
            type: 'select',
            options: [
              'CBT',
              'Play-based',
              'Behavioural',
              'Parent coaching',
              'Psychoeducation',
              'Regulation strategy',
              'Other',
            ],
          },
          {
            id: 'responseProgress',
            label: 'Response and progress',
            type: 'text',
            guidance: 'Engagement, insight, skills practised, barriers',
          },
          {
            id: 'riskAssessment',
            label: 'Risk assessment',
            type: 'longtext',
            guidance:
              'No current risk / risk identified / safety plan / escalation completed',
          },
          {
            id: 'homeworkCarryover',
            label: 'Homework / carryover',
            type: 'text',
            guidance: 'Practice task, parent role, school action',
          },
          {
            id: 'plan',
            label: 'Plan',
            type: 'text',
            guidance: 'Next session focus, referral, review, MDT communication',
          },
        ],
      },
      signOffSection(),
    ],
  },
};

export const PSYCHOLOGY_TEMPLATES = [PSYCH_ASSESSMENT, PSYCH_SESSION_NOTE];
