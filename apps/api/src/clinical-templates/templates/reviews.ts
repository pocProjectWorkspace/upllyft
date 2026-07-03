/**
 * Review, planning and closure templates (cross-discipline).
 *   15 — Multidisciplinary Assessment Report
 *   16 — Milestone and SMART Goal Plan
 *   17 — Progress Review and Outcome Report
 *   18 — Discharge and Transition Summary
 */
import type { ClinicalTemplate } from '../clinical-types';
import { identifierSection, signOffSection } from './shared';

export const MDT_ASSESSMENT: ClinicalTemplate = {
  code: 'MDT_ASSESSMENT',
  name: 'Multidisciplinary Assessment Report',
  description:
    'Integrated assessment report for therapy centre, school and clinic MDT reviews.',
  discipline: 'MULTIDISCIPLINARY',
  activityType: 'MDT_REVIEW',
  version: 1,
  schema: {
    sections: [
      identifierSection('A. Report identifiers and team', [
        {
          id: 'mdtReviewType',
          label: 'MDT review type',
          type: 'select',
          options: [
            'Initial',
            'Annual',
            'Transition',
            'Discharge',
            'Complex case',
            'School placement',
          ],
        },
        {
          id: 'teamMembersPresent',
          label: 'Team members present',
          type: 'table',
          columns: [
            { key: 'name', label: 'Name' },
            { key: 'role', label: 'Role' },
            { key: 'organisation', label: 'Organisation' },
            { key: 'licenceId', label: 'Licence / registration ID' },
            { key: 'signatureStatus', label: 'Signature status' },
          ],
        },
      ]),
      {
        id: 'integratedBackground',
        title: 'B. Integrated background',
        fields: [
          {
            id: 'reasonForMdtAssessment',
            label: 'Reason for MDT assessment',
            type: 'longtext',
            guidance: 'Core referral question and decision needed',
          },
          {
            id: 'parentClientPriorities',
            label: 'Parent/client priorities',
            type: 'text',
            guidance: 'Top concerns and desired outcomes',
          },
          {
            id: 'documentsReviewed',
            label: 'Documents reviewed',
            type: 'checklist',
            options: [
              'Prior reports',
              'School records',
              'Medical letters',
              'Session notes',
              'Work samples',
            ],
          },
          {
            id: 'assessmentDatesSettings',
            label: 'Assessment dates/settings',
            type: 'table',
            columns: [
              { key: 'discipline', label: 'Discipline' },
              { key: 'date', label: 'Date', type: 'date' },
              { key: 'location', label: 'Location' },
              { key: 'method', label: 'Method' },
            ],
          },
        ],
      },
      {
        id: 'disciplineSummaries',
        title: 'C. Discipline summaries',
        fields: [
          {
            id: 'speechLanguageSummary',
            label: 'Speech and language summary',
            type: 'longtext',
            guidance: 'Communication strengths, needs, recommendations',
          },
          {
            id: 'occupationalTherapySummary',
            label: 'Occupational therapy summary',
            type: 'longtext',
            guidance: 'Sensory-motor/ADL/school participation findings',
          },
          {
            id: 'behaviourAbaSummary',
            label: 'Behaviour/ABA summary',
            type: 'longtext',
            guidance: 'Behaviour function, skill deficits, support plan',
          },
          {
            id: 'psychologySummary',
            label: 'Psychology summary',
            type: 'longtext',
            guidance: 'Cognitive/adaptive/social-emotional formulation and risk',
          },
          {
            id: 'specialEducationSummary',
            label: 'Special education summary',
            type: 'longtext',
            guidance:
              'Present levels, curriculum access, accommodations, IEP priorities',
          },
          {
            id: 'physiotherapySummary',
            label: 'Physiotherapy summary',
            type: 'longtext',
            guidance: 'Motor/mobility findings, functional participation, equipment',
          },
          {
            id: 'medicalSummary',
            label: 'Medical summary',
            type: 'longtext',
            guidance:
              'Diagnosis/medical considerations, medication/referrals where relevant',
          },
        ],
      },
      {
        id: 'integratedFormulation',
        title: 'D. Integrated formulation and plan',
        fields: [
          {
            id: 'strengthsProtectiveFactors',
            label: 'Strengths and protective factors',
            type: 'text',
            guidance: 'Child/family/school strengths',
          },
          {
            id: 'primaryNeedsByPriority',
            label: 'Primary needs by priority',
            type: 'table',
            columns: [
              { key: 'need', label: 'Need' },
              { key: 'evidence', label: 'Evidence' },
              { key: 'impact', label: 'Impact' },
              { key: 'urgency', label: 'Urgency' },
              { key: 'responsibleDiscipline', label: 'Responsible discipline' },
            ],
          },
          {
            id: 'sharedFormulation',
            label: 'Shared formulation',
            type: 'longtext',
            guidance:
              'How communication, sensory, behaviour, learning, medical and environment interact',
          },
          {
            id: 'integratedGoals',
            label: 'Integrated goals',
            type: 'smartgoal',
            columns: [
              { key: 'goal', label: 'Goal' },
              { key: 'owner', label: 'Owner' },
              { key: 'disciplines', label: 'Contributing disciplines' },
              { key: 'measurement', label: 'Measurement' },
              { key: 'timeframe', label: 'Timeframe' },
            ],
          },
          {
            id: 'recommendedServices',
            label: 'Recommended services',
            type: 'table',
            columns: [
              { key: 'service', label: 'Service' },
              { key: 'frequency', label: 'Frequency' },
              { key: 'duration', label: 'Duration' },
              { key: 'setting', label: 'Setting' },
              { key: 'responsiblePerson', label: 'Responsible person' },
            ],
          },
          {
            id: 'schoolHomeRecommendations',
            label: 'School/home recommendations',
            type: 'text',
            guidance:
              'Classroom accommodations, home programme, parent training, environmental supports',
          },
          {
            id: 'riskSafeguardingPlan',
            label: 'Risk/safeguarding plan',
            type: 'text',
            guidance: 'Risks, mitigations, escalation contacts',
          },
          {
            id: 'reviewSchedule',
            label: 'Review schedule',
            type: 'text',
            guidance: 'Next MDT review, progress reports, interim checks',
          },
        ],
      },
      signOffSection(),
    ],
  },
};

export const GOAL_PLAN: ClinicalTemplate = {
  code: 'GOAL_PLAN',
  name: 'Milestone and SMART Goal Plan',
  description:
    'Reusable goal engine linked to assessments, session notes, IEPs, reviews and discharge.',
  discipline: 'UNIVERSAL',
  activityType: 'GOAL_PLAN',
  version: 1,
  schema: {
    sections: [
      identifierSection('A. Plan identifiers', [
        {
          id: 'planType',
          label: 'Plan type',
          type: 'select',
          options: [
            'Therapy plan',
            'IEP goals',
            'MDT shared plan',
            'Home programme',
            'Transition plan',
          ],
        },
        {
          id: 'planPeriod',
          label: 'Plan period',
          type: 'daterange',
          guidance: 'Start, review, end',
        },
      ]),
      {
        id: 'goalMilestoneTable',
        title: 'B. Goal/milestone table',
        fields: [
          {
            id: 'domain',
            label: 'Domain',
            type: 'select',
            options: [
              'Communication',
              'Sensory',
              'Motor',
              'Behaviour',
              'Learning',
              'Social',
              'ADL',
              'Emotional',
              'Medical coordination',
            ],
          },
          {
            id: 'baseline',
            label: 'Baseline',
            type: 'text',
            guidance: 'Current level, date measured, evidence source',
          },
          {
            id: 'milestoneOutcome',
            label: 'Milestone / long-term outcome',
            type: 'text',
            guidance: 'Functional outcome',
          },
          {
            id: 'smartShortTermGoal',
            label: 'SMART short-term goal',
            type: 'text',
            guidance: 'Specific measurable achievable relevant time-bound goal',
          },
          {
            id: 'successCriteria',
            label: 'Success criteria',
            type: 'text',
            guidance:
              'Accuracy, frequency, duration, independence level, setting generalisation',
          },
          {
            id: 'strategiesInterventions',
            label: 'Strategies/interventions',
            type: 'text',
            guidance: 'How goal will be taught/practised',
          },
          {
            id: 'responsibleOwner',
            label: 'Responsible owner',
            type: 'text',
            guidance: 'Therapist, parent, teacher, assistant, client',
          },
          {
            id: 'frequencyDosage',
            label: 'Frequency/dosage',
            type: 'text',
            guidance: 'Sessions/week, home practice/day, school opportunity',
          },
          {
            id: 'dataCollectionMethod',
            label: 'Data collection method',
            type: 'select',
            options: [
              'Trial data',
              'Observation',
              'Rating scale',
              'Work sample',
              'Video',
              'Parent report',
            ],
          },
          {
            id: 'reviewDateStatus',
            label: 'Review date and status',
            type: 'select',
            options: [
              'Emerging',
              'Progressing',
              'Achieved',
              'Not progressing',
              'Revised',
              'Discontinued',
            ],
          },
        ],
      },
      {
        id: 'reviewRevisionLog',
        title: 'C. Review and revision log',
        fields: [
          {
            id: 'reviewDate',
            label: 'Review date',
            type: 'date',
          },
          {
            id: 'evidenceReviewed',
            label: 'Evidence reviewed',
            type: 'text',
            guidance: 'Session data, work sample, parent report, test score',
          },
          {
            id: 'decision',
            label: 'Decision',
            type: 'select',
            options: [
              'Continue',
              'Modify',
              'Increase target',
              'Generalise',
              'Close goal',
            ],
          },
          {
            id: 'rationale',
            label: 'Rationale',
            type: 'text',
            guidance: 'Reason for decision',
          },
        ],
      },
      signOffSection(),
    ],
  },
};

export const PROGRESS_REVIEW: ClinicalTemplate = {
  code: 'PROGRESS_REVIEW',
  name: 'Progress Review and Outcome Report',
  description:
    'Periodic review of therapy, education and MDT outcomes for monthly, termly, quarterly or funding reviews.',
  discipline: 'UNIVERSAL',
  activityType: 'PROGRESS_REVIEW',
  version: 1,
  schema: {
    sections: [
      identifierSection('A. Review identifiers', [
        {
          id: 'reviewPeriod',
          label: 'Review period',
          type: 'daterange',
          guidance: 'From - to',
        },
        {
          id: 'reviewType',
          label: 'Review type',
          type: 'select',
          options: [
            'Monthly',
            'Quarterly',
            'Term',
            'Six-month',
            'Annual',
            'Funding',
            'Parent meeting',
            'MDT review',
          ],
        },
      ]),
      {
        id: 'serviceUtilisation',
        title: 'B. Service utilisation and engagement',
        fields: [
          {
            id: 'sessionsPlannedAttended',
            label: 'Sessions planned/attended',
            type: 'table',
            readOnly: true,
            guidance: 'Auto-calculated',
            columns: [
              { key: 'planned', label: 'Planned', type: 'number' },
              { key: 'attended', label: 'Attended', type: 'number' },
              { key: 'cancelled', label: 'Cancelled', type: 'number' },
              { key: 'noShow', label: 'No-show', type: 'number' },
              { key: 'attendancePct', label: 'Attendance %', type: 'number' },
            ],
          },
          {
            id: 'servicesReceived',
            label: 'Therapy/education services received',
            type: 'table',
            columns: [
              { key: 'department', label: 'Department' },
              { key: 'frequency', label: 'Frequency' },
              { key: 'provider', label: 'Provider' },
              { key: 'setting', label: 'Setting' },
            ],
          },
          {
            id: 'parentSchoolCarryover',
            label: 'Parent/school carryover',
            type: 'longtext',
            guidance: 'High / moderate / low / unknown; evidence',
          },
          {
            id: 'keyEventsAffectingProgress',
            label: 'Key events affecting progress',
            type: 'text',
            guidance:
              'Illness, school change, medication change, family context, attendance',
          },
        ],
      },
      {
        id: 'goalProgress',
        title: 'C. Goal progress',
        fields: [
          {
            id: 'goalSummary',
            label: 'Goal summary',
            type: 'table',
            readOnly: true,
            guidance: 'Auto-populated',
            columns: [
              { key: 'goal', label: 'Goal' },
              { key: 'baseline', label: 'Baseline' },
              { key: 'currentLevel', label: 'Current level' },
              { key: 'status', label: 'Status' },
              { key: 'evidence', label: 'Evidence' },
              { key: 'comments', label: 'Comments' },
            ],
          },
          {
            id: 'outcomeMeasures',
            label: 'Outcome measures',
            type: 'table',
            columns: [
              { key: 'measure', label: 'Measure' },
              { key: 'previousScore', label: 'Previous score' },
              { key: 'currentScore', label: 'Current score' },
              { key: 'interpretation', label: 'Interpretation' },
            ],
          },
          {
            id: 'generalisation',
            label: 'Generalisation',
            type: 'text',
            guidance: 'Home, school, community carryover',
          },
          {
            id: 'barriersSupports',
            label: 'Barriers and supports',
            type: 'text',
            guidance: 'What helped, what limited progress',
          },
          {
            id: 'revisedRecommendations',
            label: 'Revised recommendations',
            type: 'text',
            guidance:
              'Continue/increase/decrease service, change approach, refer, revise goal',
          },
          {
            id: 'nextReviewPlan',
            label: 'Next review plan',
            type: 'text',
            guidance: 'Next period priorities',
          },
        ],
      },
      signOffSection(),
    ],
  },
};

export const DISCHARGE_SUMMARY: ClinicalTemplate = {
  code: 'DISCHARGE_SUMMARY',
  name: 'Discharge and Transition Summary',
  description:
    'Episode closure, transition or handover report when a client exits, moves provider/school or pauses care.',
  discipline: 'UNIVERSAL',
  activityType: 'DISCHARGE',
  version: 1,
  schema: {
    sections: [
      identifierSection('A. Discharge identifiers', [
        {
          id: 'dischargeTransitionType',
          label: 'Discharge/transition type',
          type: 'select',
          options: [
            'Completed goals',
            'Moved provider',
            'School transition',
            'Parent requested',
            'Non-attendance',
            'Medical referral',
            'Service not appropriate',
            'Paused',
          ],
        },
        {
          id: 'episodeDates',
          label: 'Episode dates',
          type: 'daterange',
          guidance: 'Start date - discharge date',
        },
      ]),
      {
        id: 'summaryOfCare',
        title: 'B. Summary of care',
        fields: [
          {
            id: 'reasonForOriginalReferral',
            label: 'Reason for original referral',
            type: 'text',
            guidance: 'Initial concern and referral question',
          },
          {
            id: 'servicesProvided',
            label: 'Services provided',
            type: 'table',
            columns: [
              { key: 'department', label: 'Department' },
              { key: 'dates', label: 'Dates' },
              { key: 'frequency', label: 'Frequency' },
              { key: 'provider', label: 'Provider' },
              { key: 'setting', label: 'Setting' },
            ],
          },
          {
            id: 'assessmentsCompleted',
            label: 'Assessments/reports completed',
            type: 'attachment',
            guidance: 'Report title, date, author',
          },
          {
            id: 'goalsAtDischarge',
            label: 'Goals at discharge',
            type: 'table',
            readOnly: true,
            guidance: 'Auto-populated',
            columns: [
              { key: 'goal', label: 'Goal' },
              { key: 'baseline', label: 'Baseline' },
              { key: 'finalStatus', label: 'Final status' },
              { key: 'evidence', label: 'Evidence' },
            ],
          },
          {
            id: 'progressSummary',
            label: 'Progress summary',
            type: 'text',
            guidance: 'Key gains, current functioning, remaining needs',
          },
          {
            id: 'reasonForDischarge',
            label: 'Reason for discharge/transition',
            type: 'text',
            guidance: 'Clinical/educational/administrative rationale',
          },
        ],
      },
      {
        id: 'handoverPlan',
        title: 'C. Handover plan',
        fields: [
          {
            id: 'homeProgrammeMaintenancePlan',
            label: 'Home programme / maintenance plan',
            type: 'text',
            guidance: 'What family should continue, frequency, warning signs',
          },
          {
            id: 'schoolRecommendations',
            label: 'School recommendations',
            type: 'text',
            guidance: 'Accommodations, supports, review dates',
          },
          {
            id: 'onwardReferrals',
            label: 'Onward referrals',
            type: 'table',
            columns: [
              { key: 'providerService', label: 'Provider/service' },
              { key: 'reason', label: 'Reason' },
              { key: 'urgency', label: 'Urgency' },
              { key: 'contact', label: 'Contact if allowed' },
            ],
          },
          {
            id: 'riskSafetyPlan',
            label: 'Risk/safety plan',
            type: 'text',
            guidance: 'Any ongoing safety considerations',
          },
          {
            id: 'reEntryCriteria',
            label: 'Re-entry criteria',
            type: 'text',
            guidance: 'When to return/re-refer; signs of regression or new concern',
          },
          {
            id: 'documentsSharedConsent',
            label: 'Documents shared and consent status',
            type: 'table',
            columns: [
              { key: 'recipient', label: 'Recipient' },
              { key: 'document', label: 'Document' },
              { key: 'consentBasis', label: 'Consent/legal basis' },
              { key: 'dateShared', label: 'Date shared', type: 'date' },
            ],
          },
        ],
      },
      signOffSection(),
    ],
  },
};

export const REVIEW_TEMPLATES = [
  MDT_ASSESSMENT,
  GOAL_PLAN,
  PROGRESS_REVIEW,
  DISCHARGE_SUMMARY,
];
