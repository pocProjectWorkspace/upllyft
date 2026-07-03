/**
 * Universal / cross-discipline templates.
 *   01 — Intake, Case History and Consent
 *   02 — Universal Therapy Session Note
 */
import type { ClinicalTemplate } from '../clinical-types';
import { identifierSection, signOffSection } from './shared';

export const INTAKE_CASE_HISTORY: ClinicalTemplate = {
  code: 'INTAKE_CASE_HISTORY',
  name: 'Intake, Case History and Consent',
  description:
    'Cross-functional onboarding record for therapy centres, schools and multidisciplinary organisations.',
  discipline: 'UNIVERSAL',
  activityType: 'INTAKE',
  version: 1,
  schema: {
    sections: [
      identifierSection('A. Client identifiers', []),
      {
        id: 'referralConcerns',
        title: 'B. Referral and presenting concerns',
        fields: [
          {
            id: 'primaryConcern',
            label: 'Primary concern in parent/caregiver words',
            type: 'longtext',
            guidance: 'Concerns, examples, frequency, duration',
          },
          {
            id: 'referralQuestion',
            label: 'Referral question',
            type: 'multiselect',
            options: [
              'Speech/language',
              'Sensory',
              'Behaviour',
              'Learning',
              'Attention',
              'Motor',
              'Emotional',
              'Medical',
              'School readiness',
            ],
          },
          {
            id: 'urgencyRiskFlag',
            label: 'Urgency / risk flag',
            type: 'select',
            options: ['Routine', 'Priority', 'Safeguarding', 'Medical urgent'],
          },
          {
            id: 'previousAssessments',
            label: 'Previous assessments',
            type: 'longtext',
            guidance: 'Date, provider, diagnosis/impression, recommendations',
          },
          {
            id: 'currentServices',
            label: 'Current services',
            type: 'table',
            columns: [
              { key: 'therapyType', label: 'Therapy type' },
              { key: 'provider', label: 'Provider' },
              { key: 'frequency', label: 'Frequency' },
              { key: 'startDate', label: 'Start date' },
              { key: 'response', label: 'Response' },
            ],
          },
        ],
      },
      {
        id: 'developmentalMedicalHistory',
        title: 'C. Developmental and medical history',
        fields: [
          {
            id: 'birthHistory',
            label: 'Pregnancy / birth history',
            type: 'longtext',
            guidance: 'Gestation, delivery, birth weight, NICU, complications',
          },
          {
            id: 'developmentalMilestones',
            label: 'Developmental milestones',
            type: 'table',
            columns: [
              { key: 'motor', label: 'Motor' },
              { key: 'speechLanguage', label: 'Speech / language' },
              { key: 'social', label: 'Social' },
              { key: 'selfCare', label: 'Self-care' },
              { key: 'play', label: 'Play' },
              { key: 'toiletTraining', label: 'Toilet training' },
            ],
          },
          {
            id: 'medicalDiagnoses',
            label: 'Medical diagnoses / conditions',
            type: 'longtext',
            guidance: 'Diagnosis, date, treating doctor, relevant notes',
          },
          {
            id: 'medicationAllergies',
            label: 'Medication and allergies',
            type: 'table',
            columns: [
              { key: 'medication', label: 'Medication' },
              { key: 'dose', label: 'Dose if shared' },
              { key: 'purpose', label: 'Purpose' },
              { key: 'sideEffects', label: 'Side effects' },
              { key: 'allergies', label: 'Allergies' },
            ],
          },
          {
            id: 'hearingVisionStatus',
            label: 'Hearing / vision status',
            type: 'select',
            options: ['Normal', 'Concern', 'Tested', 'Referred'],
          },
          {
            id: 'sleepFeedingToileting',
            label: 'Sleep, feeding, toileting',
            type: 'text',
            guidance: 'Current patterns and concerns',
          },
        ],
      },
      {
        id: 'familyEducationRoutine',
        title: 'D. Family, education and daily routine',
        fields: [
          {
            id: 'familyComposition',
            label: 'Family composition',
            type: 'text',
            guidance: 'Parents/caregivers/siblings, home languages',
          },
          {
            id: 'schoolHistory',
            label: 'School / nursery history',
            type: 'text',
            guidance: 'Class/grade, curriculum, teacher concerns, support received',
          },
          {
            id: 'dailyRoutine',
            label: 'Daily routine and participation',
            type: 'text',
            guidance: 'Home, school, community, play/leisure, peer participation',
          },
          {
            id: 'strengthsInterests',
            label: 'Strengths and interests',
            type: 'text',
            guidance: 'Motivators, preferred toys/activities, talents',
          },
          {
            id: 'parentGoals',
            label: 'Parent goals',
            type: 'longtext',
            guidance: 'Top 3 outcomes family wants',
          },
        ],
      },
      {
        id: 'consentControls',
        title: 'E. Consent and data-sharing controls',
        fields: [
          {
            id: 'consentAssessment',
            label: 'Consent for assessment',
            type: 'checkbox',
            guidance: 'Yes / No — scope and date',
          },
          {
            id: 'consentTherapy',
            label: 'Consent for therapy/intervention',
            type: 'checkbox',
            guidance: 'Yes / No — scope and date',
          },
          {
            id: 'consentReportSharing',
            label: 'Consent for report sharing',
            type: 'checkbox',
            guidance: 'Parent / school / physician / insurer / authority / other',
          },
          {
            id: 'consentTeletherapy',
            label: 'Consent for teletherapy',
            type: 'checkbox',
            guidance: 'Yes / No — platform, privacy setting',
          },
          {
            id: 'consentMedia',
            label: 'Consent for photo/video/audio',
            type: 'checkbox',
            guidance: 'Clinical use only / Training / Marketing — avoid default opt-in',
          },
          {
            id: 'consentAiDrafting',
            label: 'Consent for AI-assisted drafting',
            type: 'checkbox',
            guidance: 'AI may assist note/report drafting; professional review required',
          },
          {
            id: 'languageInterpreter',
            label: 'Language and interpreter',
            type: 'select',
            options: ['English', 'Arabic', 'Hindi', 'Malayalam', 'Other'],
            guidance: 'Interpreter name if used',
          },
        ],
      },
      signOffSection(),
    ],
  },
};

export const UNIVERSAL_SESSION_NOTE: ClinicalTemplate = {
  code: 'UNIVERSAL_SESSION_NOTE',
  name: 'Universal Therapy Session Note',
  description:
    'Configurable SOAP/DAP note for speech, OT, behaviour, psychology, special education and physiotherapy.',
  discipline: 'UNIVERSAL',
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
            'Assessment',
            'Therapy',
            'Parent training',
            'School observation',
            'Group',
            'Teletherapy',
          ],
        },
        {
          id: 'department',
          label: 'Department',
          type: 'select',
          options: [
            'Speech',
            'OT',
            'Behaviour',
            'Psychology',
            'Special Education',
            'Physiotherapy',
            'Medical',
          ],
        },
        {
          id: 'attendance',
          label: 'Attendance',
          type: 'select',
          options: [
            'Attended',
            'Late',
            'No-show',
            'Cancelled',
            'Rescheduled',
          ],
        },
        {
          id: 'participantsPresent',
          label: 'Participants present',
          type: 'multiselect',
          options: [
            'Client',
            'Parent',
            'Therapist',
            'Teacher',
            'Assistant',
            'Interpreter',
          ],
        },
      ]),
      {
        id: 'soapDap',
        title: 'B. SOAP / DAP structure',
        fields: [
          {
            id: 'subjective',
            label: 'Subjective / parent-teacher report',
            type: 'longtext',
            guidance:
              'New concerns, carryover, mood, sleep, medication changes, school notes',
          },
          {
            id: 'objectiveData',
            label: 'Objective data',
            type: 'table',
            columns: [
              { key: 'goal', label: 'Goal' },
              { key: 'activity', label: 'Activity' },
              { key: 'promptLevel', label: 'Prompt level' },
              { key: 'trials', label: 'Trials', type: 'number' },
              { key: 'accuracy', label: 'Accuracy %', type: 'number' },
              { key: 'duration', label: 'Duration' },
              { key: 'frequency', label: 'Frequency' },
              { key: 'behaviourCount', label: 'Behaviour count', type: 'number' },
              { key: 'evidence', label: 'Evidence' },
            ],
          },
          {
            id: 'assessment',
            label: 'Assessment / clinical interpretation',
            type: 'longtext',
            guidance:
              'Progress, barriers, response to strategy, generalisation, risk/safety if any',
          },
          {
            id: 'plan',
            label: 'Plan',
            type: 'longtext',
            guidance:
              'Next goals, home programme, school strategy, review/referral, materials needed',
          },
        ],
      },
      {
        id: 'disciplineWidgets',
        title: 'C. Discipline widget fields',
        fields: [
          {
            id: 'speechWidget',
            label: 'Speech widget',
            type: 'longtext',
            guidance:
              'Target sound/language/pragmatic skill, cueing level, trials, accuracy, generalisation',
          },
          {
            id: 'otWidget',
            label: 'OT widget',
            type: 'longtext',
            guidance:
              'Sensory system, motor activity, regulation level, ADL/school task, safety',
          },
          {
            id: 'abaWidget',
            label: 'ABA/behaviour widget',
            type: 'longtext',
            guidance:
              'Antecedent, behaviour, consequence, function hypothesis, response strategy, data',
          },
          {
            id: 'psychologyWidget',
            label: 'Psychology widget',
            type: 'longtext',
            guidance: 'Mood, affect, thought, engagement, risk, intervention, homework',
          },
          {
            id: 'specialEducationWidget',
            label: 'Special education widget',
            type: 'longtext',
            guidance:
              'IEP goal, activity, level of support, work sample, accommodation used',
          },
          {
            id: 'physioWidget',
            label: 'Physio widget',
            type: 'longtext',
            guidance:
              'Pain, ROM, gait, balance, transfers, exercise tolerance, home exercise compliance',
          },
        ],
      },
      {
        id: 'guidanceFollowUp',
        title: 'D. Parent/caregiver guidance and follow-up',
        fields: [
          {
            id: 'homeProgramme',
            label: 'Home programme issued',
            type: 'checkbox',
            guidance: 'Strategy, frequency, materials, safety notes',
          },
          {
            id: 'parentTraining',
            label: 'Parent/caregiver training',
            type: 'checkbox',
            guidance: 'Topic, demonstration, understanding confirmed',
          },
          {
            id: 'escalationReferral',
            label: 'Escalation/referral required',
            type: 'checkbox',
            guidance: 'Medical / safeguarding / school / MDT / no escalation',
          },
          {
            id: 'nextSessionPlan',
            label: 'Next session plan',
            type: 'text',
            guidance: 'Date, focus, resources required',
          },
        ],
      },
      signOffSection(),
    ],
  },
};

export const UNIVERSAL_TEMPLATES = [INTAKE_CASE_HISTORY, UNIVERSAL_SESSION_NOTE];
