/**
 * Occupational Therapy templates.
 *   05 — Occupational Therapy Assessment Report
 *   06 — Occupational Therapy Session Note
 */
import type { ClinicalTemplate } from '../clinical-types';
import { identifierSection, signOffSection } from './shared';

export const OT_ASSESSMENT: ClinicalTemplate = {
  code: 'OT_ASSESSMENT',
  name: 'Occupational Therapy Assessment Report',
  description: 'Pediatric and school/clinic OT evaluation structure.',
  discipline: 'OCCUPATIONAL',
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
            'School observation',
            'Sensory profile',
            'Handwriting',
            'ADL review',
          ],
        },
      ]),
      {
        id: 'occupationalProfile',
        title: 'B. Occupational profile',
        fields: [
          {
            id: 'reasonForReferral',
            label: 'Reason for referral and family priorities',
            type: 'longtext',
            guidance: 'Why the child is seeking OT and top concerns',
          },
          {
            id: 'occupationalHistory',
            label: 'Occupational history and routines',
            type: 'text',
            guidance: 'Daily routines, roles, interests, participation patterns',
          },
          {
            id: 'occupationsAndBarriers',
            label: 'Successful occupations and barriers',
            type: 'text',
            guidance: 'Where child manages well; where participation breaks down',
          },
          {
            id: 'context',
            label: 'Home/school/community context',
            type: 'text',
            guidance:
              'Physical, social, cultural and environmental supports/barriers',
          },
          {
            id: 'clientPriorities',
            label: 'Client priorities and desired outcomes',
            type: 'longtext',
            guidance: 'Self-care, play, learning, participation, wellbeing',
          },
        ],
      },
      {
        id: 'assessmentDomains',
        title: 'C. Assessment domains',
        fields: [
          {
            id: 'sensoryProcessing',
            label: 'Sensory processing and regulation',
            type: 'longtext',
            guidance:
              'Tactile, vestibular, proprioceptive, auditory, visual, oral, modulation, seeking/avoidance',
          },
          {
            id: 'fineMotor',
            label: 'Fine motor and hand function',
            type: 'longtext',
            guidance:
              'Grasp, bilateral use, in-hand manipulation, dexterity, tool use',
          },
          {
            id: 'grossMotor',
            label: 'Gross motor and postural control',
            type: 'longtext',
            guidance: 'Core strength, balance, coordination, endurance',
          },
          {
            id: 'praxis',
            label: 'Praxis / motor planning',
            type: 'text',
            guidance: 'Ideation, sequencing, imitation, novel motor tasks',
          },
          {
            id: 'visualMotor',
            label: 'Visual motor and visual perception',
            type: 'longtext',
            guidance:
              'Copying, drawing, puzzles, spatial relations, tracking',
          },
          {
            id: 'adlSelfCare',
            label: 'ADL / self-care',
            type: 'checklist',
            options: [
              'Feeding',
              'Dressing',
              'Grooming',
              'Toileting',
              'Sleep routines',
            ],
          },
          {
            id: 'schoolParticipation',
            label: 'School participation',
            type: 'text',
            guidance:
              'Handwriting, classroom seating, attention, transitions, PE/playground',
          },
          {
            id: 'executiveFunction',
            label: 'Executive function and attention',
            type: 'text',
            guidance:
              'Planning, impulse control, emotional regulation, task persistence',
          },
          {
            id: 'safetyAndRisk',
            label: 'Safety and risk',
            type: 'text',
            guidance: 'Falls, mouthing, elopement, aggression, equipment risks',
          },
        ],
      },
      {
        id: 'findingsAndPlan',
        title: 'D. Findings and intervention plan',
        fields: [
          {
            id: 'standardizedResults',
            label: 'Standardized/informal results',
            type: 'table',
            columns: [
              { key: 'tool', label: 'Tool' },
              { key: 'score', label: 'Score' },
              { key: 'interpretation', label: 'Interpretation' },
              { key: 'limitations', label: 'Limitations' },
            ],
          },
          {
            id: 'strengths',
            label: 'Strengths',
            type: 'text',
            guidance: 'Motivators, abilities, protective factors',
          },
          {
            id: 'needsImpact',
            label: 'Needs / functional impact',
            type: 'text',
            guidance: 'Impact on ADL, school, play, family routines',
          },
          {
            id: 'recommendations',
            label: 'Recommendations',
            type: 'longtext',
            guidance:
              'OT frequency, sensory diet, seating/equipment, school/home adaptations, referral',
          },
          {
            id: 'smartGoals',
            label: 'SMART goals',
            type: 'smartgoal',
            columns: [
              { key: 'baseline', label: 'Baseline' },
              { key: 'target', label: 'Target' },
              { key: 'strategy', label: 'Strategy' },
              { key: 'dataMethod', label: 'Data method' },
              { key: 'timeframe', label: 'Timeframe' },
            ],
          },
          {
            id: 'homeSchoolProgramme',
            label: 'Home/school programme',
            type: 'text',
            guidance:
              'Daily activities, environmental modifications, safety guidance',
          },
        ],
      },
      signOffSection(),
    ],
  },
};

export const OT_SESSION_NOTE: ClinicalTemplate = {
  code: 'OT_SESSION_NOTE',
  name: 'Occupational Therapy Session Note',
  description:
    'Sensory-motor, ADL, school participation and functional goal tracking.',
  discipline: 'OCCUPATIONAL',
  activityType: 'SESSION_NOTE',
  version: 1,
  schema: {
    sections: [
      identifierSection('A. Session metadata', [
        {
          id: 'sessionFocus',
          label: 'Session focus',
          type: 'multiselect',
          options: [
            'Sensory regulation',
            'Fine motor',
            'Gross motor',
            'ADL',
            'Handwriting',
            'Play',
            'School participation',
          ],
        },
      ]),
      {
        id: 'interventionData',
        title: 'B. OT intervention data',
        fields: [
          {
            id: 'goalAddressed',
            label: 'Goal addressed',
            type: 'text',
            guidance: 'Goal ID and description',
          },
          {
            id: 'regulationState',
            label: 'Regulation state on arrival',
            type: 'select',
            options: [
              'Calm/alert',
              'Under-responsive',
              'Over-responsive',
              'Dysregulated',
              'Fatigued',
            ],
          },
          {
            id: 'activitiesCompleted',
            label: 'Activities completed',
            type: 'table',
            columns: [
              { key: 'activity', label: 'Activity' },
              { key: 'targeted', label: 'Sensory system / motor skill targeted' },
              { key: 'duration', label: 'Duration' },
              { key: 'assistance', label: 'Assistance level' },
              { key: 'response', label: 'Response' },
            ],
          },
          {
            id: 'performanceData',
            label: 'Performance data',
            type: 'longtext',
            guidance:
              'Accuracy, repetitions, time on task, grip, endurance, independence level',
          },
          {
            id: 'safetyObservations',
            label: 'Safety observations',
            type: 'text',
            guidance:
              'Falls, avoidance, distress, contraindications, equipment safety',
          },
          {
            id: 'strategyTrained',
            label: 'Parent/school strategy trained',
            type: 'text',
            guidance:
              'Sensory diet, seating, transitions, ADL routine, handwriting support',
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
            guidance: 'Parent/teacher report and carryover',
          },
          {
            id: 'objective',
            label: 'Objective',
            type: 'longtext',
            guidance: 'Activity and performance data',
          },
          {
            id: 'assessment',
            label: 'Assessment',
            type: 'longtext',
            guidance: 'Progress, functional implication, barriers',
          },
          {
            id: 'plan',
            label: 'Plan',
            type: 'longtext',
            guidance: 'Next activities, home/school tasks, referral/review',
          },
        ],
      },
      signOffSection(),
    ],
  },
};

export const OT_TEMPLATES = [OT_ASSESSMENT, OT_SESSION_NOTE];
