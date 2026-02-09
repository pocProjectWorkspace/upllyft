export const STRUCTURED_PLAN_SUB_TYPES = {
  weekly_plan: {
    label: 'Weekly Plan',
    description:
      'A 7-day activity grid with daily therapeutic activities, goals, and progress checkboxes',
    primaryDomains: ['ADAPTIVE', 'COGNITIVE'],
    exampleOutput: '7-column weekly plan grid with activities for each day and tracking',
  },
  daily_routine: {
    label: 'Daily Routine',
    description:
      'Time-blocked daily schedule with activity cards, visual cues, and transition supports',
    primaryDomains: ['ADAPTIVE'],
    exampleOutput: 'Daily routine with morning, afternoon, evening time blocks and activity cards',
  },
} as const;

export type StructuredPlanSubType = keyof typeof STRUCTURED_PLAN_SUB_TYPES;

export const VALID_STRUCTURED_PLAN_SUB_TYPES = Object.keys(
  STRUCTURED_PLAN_SUB_TYPES,
) as StructuredPlanSubType[];
