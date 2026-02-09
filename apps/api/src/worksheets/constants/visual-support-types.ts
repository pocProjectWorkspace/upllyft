export const VISUAL_SUPPORT_SUB_TYPES = {
  visual_schedule: {
    label: 'Visual Schedule',
    description:
      'Step-by-step visual timeline with checkboxes for daily routines, transitions, or task sequences',
    primaryDomains: ['ADAPTIVE', 'COGNITIVE'],
    exampleOutput: 'Morning routine schedule with 8 illustrated steps and checkboxes',
  },
  social_story: {
    label: 'Social Story',
    description:
      'Short narrative with illustrations following Carol Gray social story criteria for understanding social situations',
    primaryDomains: ['SOCIAL'],
    exampleOutput: 'Social story: "Going to the Dentist" — 6 pages with illustrations',
  },
  emotion_thermometer: {
    label: 'Emotion Thermometer',
    description:
      'Visual 5-level emotion scale with color gradients, body cues, and coping strategies for each level',
    primaryDomains: ['SOCIAL', 'SENSORY'],
    exampleOutput: '5-zone emotion thermometer with strategies and visual cues',
  },
} as const;

export type VisualSupportSubType = keyof typeof VISUAL_SUPPORT_SUB_TYPES;

export const VALID_VISUAL_SUPPORT_SUB_TYPES = Object.keys(
  VISUAL_SUPPORT_SUB_TYPES,
) as VisualSupportSubType[];
