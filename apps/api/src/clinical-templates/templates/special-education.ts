/**
 * Special Education templates.
 *   11 — Special Education Assessment and IEP Template
 *   12 — Special Education Session and Progress Note Template
 */
import type { ClinicalTemplate } from '../clinical-types';
import { identifierSection, signOffSection } from './shared';

export const SPECIAL_EDUCATION_ASSESSMENT: ClinicalTemplate = {
  code: 'SPED_ASSESSMENT_IEP',
  name: 'Special Education Assessment and IEP Template',
  description:
    'Educational assessment, individualized education plan and progress monitoring.',
  discipline: 'SPECIAL_EDUCATION',
  activityType: 'ASSESSMENT',
  version: 1,
  schema: {
    sections: [
      identifierSection('A. Student profile', [
        {
          id: 'curriculumGrade',
          label: 'Curriculum / grade',
          type: 'text',
          guidance:
            'CBSE / ICSE / IB / British / American / UAE / other; grade/class',
        },
        {
          id: 'iepPeriod',
          label: 'IEP period',
          type: 'daterange',
          guidance: 'Start date - review date - end date',
        },
      ]),
      {
        id: 'presentLevels',
        title: 'B. Present levels and assessment summary',
        fields: [
          {
            id: 'studentAndParentVoice',
            label: 'Student and parent voice',
            type: 'text',
            guidance:
              'What the student likes, finds difficult, wants to improve; parent priorities',
          },
          {
            id: 'teacherSchoolConcerns',
            label: 'Teacher/school concerns',
            type: 'text',
            guidance:
              'Academic, behaviour, social, independence, participation',
          },
          {
            id: 'strengthsAndInterests',
            label: 'Strengths and interests',
            type: 'text',
            guidance: 'Motivators, learning strengths, peer interests',
          },
          {
            id: 'academicPresentLevels',
            label: 'Academic present levels',
            type: 'table',
            columns: [
              { key: 'reading', label: 'Reading' },
              { key: 'writing', label: 'Writing' },
              { key: 'maths', label: 'Maths' },
              { key: 'conceptKnowledge', label: 'Concept knowledge' },
              { key: 'curriculumAccess', label: 'Curriculum access' },
            ],
          },
          {
            id: 'functionalPresentLevels',
            label: 'Functional present levels',
            type: 'table',
            columns: [
              { key: 'communication', label: 'Communication' },
              { key: 'social', label: 'Social' },
              { key: 'attention', label: 'Attention' },
              { key: 'independence', label: 'Independence' },
              { key: 'selfCare', label: 'Self-care' },
              { key: 'behaviour', label: 'Behaviour' },
              { key: 'motor', label: 'Motor' },
            ],
          },
          {
            id: 'assessmentSources',
            label: 'Assessment sources',
            type: 'checklist',
            options: [
              'Class observation',
              'Work samples',
              'Teacher report',
              'Parent interview',
              'Screening tools',
              'Clinical reports',
            ],
          },
          {
            id: 'barriersToLearning',
            label: 'Barriers to learning',
            type: 'text',
            guidance:
              'Language, attention, sensory, behaviour, access, attendance, health, environment',
          },
        ],
      },
      {
        id: 'iepPlan',
        title: 'C. IEP plan',
        fields: [
          {
            id: 'priorityDomains',
            label: 'Priority domains',
            type: 'multiselect',
            options: [
              'Communication',
              'Literacy',
              'Numeracy',
              'Behaviour',
              'Social',
              'Independence',
              'Motor',
              'Life skills',
            ],
          },
          {
            id: 'annualTermGoals',
            label: 'Annual / term goals',
            type: 'smartgoal',
            columns: [
              { key: 'goal', label: 'Goal' },
              { key: 'baseline', label: 'Baseline' },
              { key: 'target', label: 'Target' },
              { key: 'strategies', label: 'Strategies' },
              { key: 'responsiblePerson', label: 'Responsible person' },
              { key: 'reviewDate', label: 'Review date', type: 'date' },
            ],
          },
          {
            id: 'shortTermObjectives',
            label: 'Short-term objectives',
            type: 'table',
            columns: [
              { key: 'objective', label: 'Objective' },
              { key: 'teachingApproach', label: 'Teaching approach' },
              { key: 'successCriteria', label: 'Success criteria' },
              { key: 'evidence', label: 'Evidence' },
            ],
          },
          {
            id: 'accommodations',
            label: 'Accommodations',
            type: 'checklist',
            options: [
              'Extra time',
              'Visual schedule',
              'Reduced writing',
              'Seating',
              'Sensory breaks',
              'Scribe',
              'Simplified instructions',
            ],
          },
          {
            id: 'curriculumModifications',
            label: 'Curriculum modifications',
            type: 'text',
            guidance:
              'Modified outcomes, adapted materials, alternate assessment',
          },
          {
            id: 'assistiveTechnologyAac',
            label: 'Assistive technology / AAC',
            type: 'text',
            guidance: 'Device, software, visual supports, access method',
          },
          {
            id: 'servicesAndSupports',
            label: 'Services and supports',
            type: 'table',
            columns: [
              { key: 'specialEducator', label: 'Special educator' },
              { key: 'therapist', label: 'Therapist' },
              { key: 'shadowTeacherLsa', label: 'Shadow teacher / LSA' },
              { key: 'parentTraining', label: 'Parent training' },
              { key: 'frequency', label: 'Frequency' },
              { key: 'location', label: 'Location' },
            ],
          },
          {
            id: 'generalisationPlan',
            label: 'Generalisation plan',
            type: 'text',
            guidance:
              'How skills will transfer to classroom, home and community',
          },
        ],
      },
      {
        id: 'progressMonitoring',
        title: 'D. Progress monitoring and review',
        fields: [
          {
            id: 'dataCollectionMethod',
            label: 'Data collection method',
            type: 'table',
            columns: [
              { key: 'workSample', label: 'Work sample' },
              { key: 'observation', label: 'Observation' },
              { key: 'quiz', label: 'Quiz' },
              { key: 'rubric', label: 'Rubric' },
              { key: 'trialData', label: 'Trial data' },
              { key: 'parentReport', label: 'Parent report' },
            ],
          },
          {
            id: 'reviewCadence',
            label: 'Review cadence',
            type: 'select',
            options: [
              'Monthly',
              'Quarterly',
              'Termly',
              'Half-yearly',
              'Annual',
            ],
          },
          {
            id: 'progressReportFormat',
            label: 'Progress report format',
            type: 'select',
            options: [
              'Achieved',
              'Progressing',
              'Emerging',
              'Not yet',
              'Discontinued',
            ],
          },
          {
            id: 'parentTeacherTherapistMeetingNotes',
            label: 'Parent-teacher-therapist meeting notes',
            type: 'table',
            columns: [
              { key: 'date', label: 'Date', type: 'date' },
              { key: 'attendees', label: 'Attendees' },
              { key: 'decisions', label: 'Decisions' },
              { key: 'actions', label: 'Actions' },
            ],
          },
          {
            id: 'transitionPlan',
            label: 'Transition plan',
            type: 'text',
            guidance:
              'Class transition, school transition, vocational/life skills, discharge from support',
          },
        ],
      },
      signOffSection(),
    ],
  },
};

export const SPECIAL_EDUCATION_SESSION_NOTE: ClinicalTemplate = {
  code: 'SPED_SESSION_NOTE',
  name: 'Special Education Session and Progress Note Template',
  description:
    'IEP target delivery, academic intervention and classroom support note.',
  discipline: 'SPECIAL_EDUCATION',
  activityType: 'SESSION_NOTE',
  version: 1,
  schema: {
    sections: [
      identifierSection('A. Session metadata', [
        {
          id: 'serviceType',
          label: 'Service type',
          type: 'select',
          options: [
            '1:1 remedial',
            'Classroom support',
            'Group',
            'Observation',
            'Teacher consult',
            'Parent consult',
          ],
        },
      ]),
      {
        id: 'iepTargetTracking',
        title: 'B. IEP target tracking',
        fields: [
          {
            id: 'iepGoalAddressed',
            label: 'IEP goal addressed',
            type: 'text',
            guidance: 'Goal ID and objective',
          },
          {
            id: 'activityAndMaterials',
            label: 'Activity and materials',
            type: 'text',
            guidance:
              'Worksheet, manipulative, story, life-skill routine, classroom activity',
          },
          {
            id: 'teachingStrategyUsed',
            label: 'Teaching strategy used',
            type: 'select',
            options: [
              'Prompting',
              'Modelling',
              'Task analysis',
              'Multisensory',
              'Visual support',
              'Peer support',
            ],
          },
          {
            id: 'levelOfSupport',
            label: 'Level of support',
            type: 'select',
            options: [
              'Independent',
              'Minimal',
              'Moderate',
              'Maximum',
              'Hand-over-hand if ethically permitted',
            ],
          },
          {
            id: 'performanceEvidence',
            label: 'Performance evidence',
            type: 'text',
            guidance:
              'Score, work sample, observation, rubric, photo with consent',
          },
          {
            id: 'accommodationUsed',
            label: 'Accommodation used',
            type: 'text',
            guidance:
              'Visual schedule, extra time, break, simplified language, assistive tech',
          },
          {
            id: 'nextStep',
            label: 'Next step',
            type: 'text',
            guidance: 'Repeat, increase complexity, generalise, revise goal',
          },
        ],
      },
      signOffSection(),
    ],
  },
};

export const SPECIAL_EDUCATION_TEMPLATES = [
  SPECIAL_EDUCATION_ASSESSMENT,
  SPECIAL_EDUCATION_SESSION_NOTE,
];
