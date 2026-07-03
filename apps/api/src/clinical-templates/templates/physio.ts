/**
 * Physiotherapy / Developmental Motor templates.
 *   13 — Physiotherapy Assessment and Session Template (combined
 *        assessment + intervention plan + session note)
 */
import type { ClinicalTemplate } from '../clinical-types';
import { identifierSection, signOffSection } from './shared';

export const PHYSIO_ASSESSMENT: ClinicalTemplate = {
  code: 'PHYSIO_ASSESSMENT',
  name: 'Physiotherapy Assessment and Session Template',
  description:
    'Assessment, intervention plan and session note for pediatric/developmental physiotherapy.',
  discipline: 'PHYSIOTHERAPY',
  activityType: 'ASSESSMENT',
  version: 1,
  schema: {
    sections: [
      identifierSection('A. Assessment identifiers', [
        {
          id: 'assessmentType',
          label: 'Assessment type',
          type: 'select',
          options: [
            'Initial',
            'Review',
            'Developmental motor',
            'Gait',
            'Postural',
            'School mobility',
            'Equipment review',
          ],
        },
      ]),
      {
        id: 'subjectiveHistory',
        title: 'B. Subjective history',
        fields: [
          {
            id: 'presentingConcern',
            label: 'Presenting concern',
            type: 'text',
            guidance:
              'Mobility, falls, delayed milestones, pain, endurance, posture, gait, school participation',
          },
          {
            id: 'medicalHistoryPrecautions',
            label: 'Medical history and precautions',
            type: 'text',
            guidance:
              'Diagnosis, seizures, surgeries, fractures, cardiac/respiratory, medication, contraindications',
          },
          {
            id: 'functionalGoals',
            label: 'Functional goals',
            type: 'text',
            guidance: 'Parent/client goals and daily participation priorities',
          },
          {
            id: 'currentEquipmentOrthotics',
            label: 'Current equipment / orthotics',
            type: 'text',
            guidance: 'AFO, wheelchair, walker, standing frame, seating, footwear',
          },
        ],
      },
      {
        id: 'objectiveAssessment',
        title: 'C. Objective assessment',
        fields: [
          {
            id: 'observationPosture',
            label: 'Observation and posture',
            type: 'text',
            guidance:
              'Alignment, symmetry, sitting/standing posture, deformities',
          },
          {
            id: 'motorMilestones',
            label: 'Motor milestones / movement quality',
            type: 'text',
            guidance:
              'Rolling, sitting, crawling, standing, walking, transitions',
          },
          {
            id: 'rangeOfMotion',
            label: 'Range of motion',
            type: 'table',
            columns: [
              { key: 'joint', label: 'Joint' },
              { key: 'left', label: 'Left' },
              { key: 'right', label: 'Right' },
              { key: 'activePassive', label: 'Active / passive' },
              { key: 'limitation', label: 'Limitation' },
              { key: 'pain', label: 'Pain' },
            ],
          },
          {
            id: 'strengthAndTone',
            label: 'Strength and tone',
            type: 'table',
            columns: [
              { key: 'muscleGroup', label: 'Muscle group' },
              { key: 'grade', label: 'Grade / description' },
              { key: 'tone', label: 'Tone' },
              { key: 'endurance', label: 'Endurance' },
            ],
          },
          {
            id: 'balanceCoordination',
            label: 'Balance and coordination',
            type: 'longtext',
            guidance:
              'Static/dynamic balance, coordination, protective responses',
          },
          {
            id: 'gaitMobility',
            label: 'Gait and mobility',
            type: 'longtext',
            guidance:
              'Pattern, aids, distance, stairs, transfers, community mobility',
          },
          {
            id: 'painFatigue',
            label: 'Pain and fatigue',
            type: 'scale',
            guidance: 'Pain score, triggers, fatigue, recovery',
          },
          {
            id: 'functionalParticipation',
            label: 'Functional participation',
            type: 'text',
            guidance: 'ADL, school access, playground, sport, community',
          },
          {
            id: 'riskRedFlags',
            label: 'Risk / red flags',
            type: 'longtext',
            guidance:
              'Urgent medical referral, falls risk, respiratory/cardiac concerns',
          },
        ],
      },
      {
        id: 'planAndSessionNote',
        title: 'D. Plan and session note',
        fields: [
          {
            id: 'clinicalImpression',
            label: 'Clinical impression / functional diagnosis',
            type: 'text',
            guidance: 'Findings, limitations, prognosis, precautions',
          },
          {
            id: 'treatmentPlan',
            label: 'Treatment plan',
            type: 'text',
            guidance:
              'Frequency, intervention types, equipment, home exercise programme',
          },
          {
            id: 'smartGoals',
            label: 'SMART goals',
            type: 'smartgoal',
            columns: [
              { key: 'goal', label: 'Goal' },
              { key: 'baseline', label: 'Baseline' },
              { key: 'target', label: 'Target' },
              { key: 'measure', label: 'Measure' },
              { key: 'timeframe', label: 'Timeframe' },
            ],
          },
          {
            id: 'sessionInterventions',
            label: 'Session interventions',
            type: 'table',
            columns: [
              { key: 'exerciseActivity', label: 'Exercise / activity' },
              { key: 'repetitionsDuration', label: 'Repetitions / duration' },
              { key: 'assistance', label: 'Assistance' },
              { key: 'response', label: 'Response' },
              { key: 'safety', label: 'Safety' },
            ],
          },
          {
            id: 'homeProgramme',
            label: 'Home programme',
            type: 'text',
            guidance: 'Exercise, dosage, caregiver instructions, safety',
          },
          {
            id: 'reviewReferral',
            label: 'Review/referral',
            type: 'text',
            guidance: 'Orthotics, medical, OT, school accessibility, MDT review',
          },
        ],
      },
      signOffSection(),
    ],
  },
};

export const PHYSIO_TEMPLATES = [PHYSIO_ASSESSMENT];
