/**
 * Behaviour / ABA templates.
 *   07 — Behaviour / ABA Assessment and Behaviour Support Plan (BIP)
 *   08 — Behaviour / ABA Session Note
 */
import type { ClinicalTemplate } from '../clinical-types';
import { identifierSection, signOffSection } from './shared';

export const ABA_ASSESSMENT: ClinicalTemplate = {
  code: 'ABA_ASSESSMENT',
  name: 'Behaviour / ABA Assessment and Behaviour Support Plan',
  description:
    'Functional behaviour assessment, skill acquisition and support plan structure.',
  discipline: 'BEHAVIOUR_ABA',
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
            'FBA',
            'behaviour review',
            'skill assessment',
            'BIP update',
            'caregiver training review',
          ],
        },
      ]),
      {
        id: 'referralBackground',
        title: 'B. Referral and background',
        fields: [
          {
            id: 'reasonForReferral',
            label: 'Reason for referral',
            type: 'longtext',
            guidance:
              'Behaviour(s) of concern, skill deficits, impact and priority',
          },
          {
            id: 'settingsWhereConcernsOccur',
            label: 'Settings where concerns occur',
            type: 'multiselect',
            options: [
              'Home',
              'School',
              'Clinic',
              'Community',
              'Transport',
              'Online',
            ],
          },
          {
            id: 'currentCommunicationMethod',
            label: 'Current communication method',
            type: 'text',
            guidance:
              'Speech, gesture, AAC, behaviour as communication, comprehension level',
          },
          {
            id: 'medicalSensoryContextual',
            label: 'Medical/sensory/contextual considerations',
            type: 'text',
            guidance:
              'Pain, sleep, medication, sensory factors, transitions, demands',
          },
          {
            id: 'previousStrategiesTried',
            label: 'Previous strategies tried',
            type: 'table',
            columns: [
              { key: 'strategy', label: 'Strategy' },
              { key: 'setting', label: 'Setting' },
              { key: 'outcome', label: 'Outcome' },
              { key: 'concerns', label: 'Concerns' },
            ],
          },
        ],
      },
      {
        id: 'functionalBehaviourAssessment',
        title: 'C. Functional behaviour assessment',
        fields: [
          {
            id: 'targetBehaviourDefinition',
            label: 'Target behaviour operational definition',
            type: 'table',
            guidance:
              'Observable, measurable definition; include non-examples',
            columns: [
              { key: 'behaviour', label: 'Behaviour' },
              { key: 'definition', label: 'Observable, measurable definition' },
              { key: 'nonExamples', label: 'Non-examples' },
            ],
          },
          {
            id: 'baselineData',
            label: 'Baseline data',
            type: 'table',
            columns: [
              { key: 'frequency', label: 'Frequency' },
              { key: 'duration', label: 'Duration' },
              { key: 'intensity', label: 'Intensity' },
              { key: 'latency', label: 'Latency' },
              { key: 'timeSample', label: 'Time sample' },
              { key: 'dateRange', label: 'Date range' },
            ],
          },
          {
            id: 'abcDataSummary',
            label: 'ABC data summary',
            type: 'table',
            columns: [
              { key: 'antecedent', label: 'Antecedent' },
              { key: 'behaviour', label: 'Behaviour' },
              { key: 'consequence', label: 'Consequence' },
              { key: 'settingEvent', label: 'Setting event' },
              { key: 'functionHypothesis', label: 'Function hypothesis' },
            ],
          },
          {
            id: 'functionHypothesis',
            label: 'Function hypothesis',
            type: 'select',
            options: [
              'Attention',
              'escape',
              'tangible',
              'sensory',
              'pain/medical',
              'multiple',
              'unclear',
            ],
          },
          {
            id: 'skillDeficitAssessment',
            label: 'Skill deficit assessment',
            type: 'text',
            guidance:
              'Communication, tolerance, waiting, transitions, play, imitation, daily living',
          },
          {
            id: 'preferenceReinforcerAssessment',
            label: 'Preference/reinforcer assessment',
            type: 'longtext',
            guidance:
              'Items/activities/social reinforcers; satiation considerations',
          },
          {
            id: 'riskSafeguarding',
            label: 'Risk and safeguarding',
            type: 'longtext',
            guidance:
              'Self-injury, aggression, elopement, choking, property destruction, abuse/neglect concerns',
          },
        ],
      },
      {
        id: 'behaviourSupportPlan',
        title: 'D. Behaviour Support Plan / BIP',
        fields: [
          {
            id: 'preventionStrategies',
            label: 'Prevention strategies',
            type: 'longtext',
            guidance:
              'Antecedent changes, visual supports, choice, schedule, environment',
          },
          {
            id: 'replacementSkills',
            label: 'Replacement skills to teach',
            type: 'smartgoal',
            guidance:
              'Functional communication, tolerance, requesting break/help, coping skill',
            columns: [
              { key: 'skill', label: 'Replacement skill' },
              { key: 'function', label: 'Function' },
              { key: 'teaching', label: 'Teaching strategy' },
              { key: 'prompt', label: 'Prompt / cueing' },
              { key: 'mastery', label: 'Mastery criteria' },
            ],
          },
          {
            id: 'reinforcementPlan',
            label: 'Reinforcement plan',
            type: 'text',
            guidance: 'What, when, schedule, who delivers, fading plan',
          },
          {
            id: 'responseStrategies',
            label: 'Response strategies',
            type: 'text',
            guidance:
              'How staff respond to early signs, escalation, recovery; avoid punitive language',
          },
          {
            id: 'crisisSafetyPlan',
            label: 'Crisis/safety plan',
            type: 'longtext',
            guidance:
              'Clear threshold, emergency steps, who to contact, documentation required',
          },
          {
            id: 'dataCollectionPlan',
            label: 'Data collection plan',
            type: 'table',
            columns: [
              { key: 'measure', label: 'Measure' },
              { key: 'frequency', label: 'Frequency' },
              { key: 'collector', label: 'Collector' },
              { key: 'reviewDate', label: 'Review date', type: 'date' },
              { key: 'graph', label: 'Graph / dashboard' },
            ],
          },
          {
            id: 'caregiverStaffTrainingPlan',
            label: 'Caregiver/staff training plan',
            type: 'text',
            guidance: 'Training topics, competency check, fidelity measure',
          },
        ],
      },
      signOffSection(),
    ],
  },
};

export const ABA_SESSION_NOTE: ClinicalTemplate = {
  code: 'ABA_SESSION_NOTE',
  name: 'Behaviour / ABA Session Note',
  description:
    'Skill acquisition, behaviour reduction and caregiver training session documentation.',
  discipline: 'BEHAVIOUR_ABA',
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
            'Direct therapy',
            'caregiver training',
            'school support',
            'supervision',
            'behaviour review',
          ],
        },
      ]),
      {
        id: 'sessionData',
        title: 'B. Session data',
        fields: [
          {
            id: 'clientPresentation',
            label: 'Client presentation',
            type: 'text',
            guidance:
              'Mood, regulation, sleep/health notes, readiness, setting events',
          },
          {
            id: 'skillAcquisitionProgrammes',
            label: 'Skill acquisition programmes',
            type: 'table',
            columns: [
              { key: 'programme', label: 'Programme' },
              { key: 'target', label: 'Target' },
              { key: 'prompting', label: 'Prompting' },
              { key: 'trials', label: 'Trials', type: 'number' },
              { key: 'correctPct', label: 'Correct %', type: 'number' },
              { key: 'independence', label: 'Independence' },
              { key: 'generalisation', label: 'Generalisation' },
            ],
          },
          {
            id: 'behaviourReductionData',
            label: 'Behaviour reduction data',
            type: 'table',
            columns: [
              { key: 'targetBehaviour', label: 'Target behaviour' },
              {
                key: 'frequencyDurationIntensity',
                label: 'Frequency/duration/intensity',
              },
              { key: 'abcSummary', label: 'ABC summary' },
              { key: 'responseStrategy', label: 'Response strategy used' },
            ],
          },
          {
            id: 'replacementBehaviourData',
            label: 'Replacement behaviour data',
            type: 'table',
            columns: [
              { key: 'replacementSkill', label: 'Replacement skill' },
              { key: 'promptLevel', label: 'Prompt level' },
              {
                key: 'independentOccurrences',
                label: 'Independent occurrences',
              },
              { key: 'reinforcement', label: 'Reinforcement' },
            ],
          },
          {
            id: 'treatmentIntegrityFidelity',
            label: 'Treatment integrity / fidelity',
            type: 'checklist',
            options: [
              'Protocol followed',
              'deviations',
              'reason',
              'supervisor notified',
            ],
          },
          {
            id: 'caregiverStaffTraining',
            label: 'Caregiver/staff training',
            type: 'text',
            guidance:
              'Topic, modelled/practised, caregiver response, action steps',
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
            type: 'text',
            guidance: 'Caregiver/teacher report',
          },
          {
            id: 'objective',
            label: 'Objective',
            type: 'text',
            readOnly: true,
            guidance: 'Programme and behaviour data',
          },
          {
            id: 'assessment',
            label: 'Assessment',
            type: 'text',
            guidance: 'Progress, function, barriers, risk changes',
          },
          {
            id: 'plan',
            label: 'Plan',
            type: 'text',
            guidance:
              'Next targets, protocol changes requiring approval, training/home practice',
          },
        ],
      },
      signOffSection(),
    ],
  },
};

export const BEHAVIOUR_TEMPLATES = [ABA_ASSESSMENT, ABA_SESSION_NOTE];
