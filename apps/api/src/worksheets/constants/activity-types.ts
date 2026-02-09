export const ACTIVITY_SUB_TYPES = {
  fine_motor: {
    label: 'Fine Motor Exercises',
    description:
      'Tracing, cutting guides, bead patterns, handwriting practice, and finger strengthening activities',
    primaryDomains: ['MOTOR'],
    exampleOutput: 'Tracing worksheet with themed progressive difficulty',
  },
  gross_motor: {
    label: 'Gross Motor Activities',
    description:
      'Movement sequences, balance exercises, coordination tasks, and obstacle courses',
    primaryDomains: ['MOTOR'],
    exampleOutput: 'Obstacle course card with visual steps',
  },
  sensory_regulation: {
    label: 'Sensory Regulation',
    description:
      'Sensory diet sheets, calm-down strategies, sensory exploration, and self-regulation tools',
    primaryDomains: ['SENSORY'],
    exampleOutput: 'My Sensory Toolbox worksheet with visual icons',
  },
  social_skills: {
    label: 'Social Skills Scenarios',
    description:
      'Conversation starters, emotion recognition, social stories, and turn-taking activities',
    primaryDomains: ['SOCIAL'],
    exampleOutput: 'How to greet a friend — 3-step visual story',
  },
  language_communication: {
    label: 'Language & Communication',
    description:
      'Picture naming, sentence building, sequencing, vocabulary, and articulation practice',
    primaryDomains: ['LANGUAGE'],
    exampleOutput: 'Match the picture to the word (themed)',
  },
  cognitive: {
    label: 'Cognitive Tasks',
    description:
      'Sorting, sequencing, matching, pattern recognition, categorization, and memory games',
    primaryDomains: ['COGNITIVE'],
    exampleOutput: 'Sort by color/shape worksheet with illustrations',
  },
  daily_living: {
    label: 'Daily Living Skills',
    description:
      'Step-by-step visual guides for routines, self-care, hygiene, and independence tasks',
    primaryDomains: ['ADAPTIVE'],
    exampleOutput: 'Morning routine — 6-step visual guide',
  },
} as const;

export type ActivitySubType = keyof typeof ACTIVITY_SUB_TYPES;

export const VALID_ACTIVITY_SUB_TYPES = Object.keys(
  ACTIVITY_SUB_TYPES,
) as ActivitySubType[];
